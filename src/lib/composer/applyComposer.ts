import type { SimulationConfig } from "@/types/config";
import type {
  CompiledComposerRule,
  CompiledCondition,
  CompiledEffect,
  CompiledModifier,
  CompiledTargetSelector,
} from "@/types/composer";
import type {
  PolicyApplicationResult,
  PolicyApplicationSummary,
  PolicyBracket,
} from "@/types/policies";
import type { Agent } from "@/types/simulation";

function createEmptySummary(): PolicyApplicationSummary {
  return {
    netCost: 0,
    grossSpend: 0,
    grossRevenue: 0,
    appliedPolicyIds: [],
  };
}

function appendAppliedRule(
  summary: PolicyApplicationSummary,
  ruleId: string,
) {
  if (summary.appliedPolicyIds.includes(ruleId)) {
    return summary;
  }

  return {
    ...summary,
    appliedPolicyIds: [...summary.appliedPolicyIds, ruleId],
  };
}

function shouldApplyRule(
  rule: CompiledComposerRule,
  step: number,
  config: SimulationConfig,
) {
  if (!rule.enabled) {
    return false;
  }

  if (rule.cadence === "step") {
    return true;
  }

  return step % config.economy.yearInterval === 0;
}

function calculateProgressiveTax(
  wealth: number,
  brackets: PolicyBracket[],
) {
  const sortedBrackets = [...brackets].sort(
    (left, right) => left.threshold - right.threshold,
  );

  let tax = 0;

  sortedBrackets.forEach((bracket, index) => {
    if (wealth <= bracket.threshold) {
      return;
    }

    const nextThreshold = sortedBrackets[index + 1]?.threshold ?? wealth;
    const upperBound = Math.min(wealth, nextThreshold);
    const taxableAmount = Math.max(0, upperBound - bracket.threshold);
    tax += taxableAmount * bracket.rate;
  });

  return tax;
}

function selectTargetIndices(
  agents: Agent[],
  target: CompiledTargetSelector,
) {
  switch (target.kind) {
    case "allAgents":
      return agents.map((_, index) => index);
    case "bottomWealthPercent": {
      const count = Math.max(
        1,
        Math.ceil((agents.length * target.percent) / 100),
      );

      return agents
        .map((agent, index) => ({ index, wealth: agent.wealth }))
        .sort((left, right) => left.wealth - right.wealth)
        .slice(0, count)
        .map((entry) => entry.index);
    }
    case "topWealthPercent": {
      const count = Math.max(
        1,
        Math.ceil((agents.length * target.percent) / 100),
      );

      return agents
        .map((agent, index) => ({ index, wealth: agent.wealth }))
        .sort((left, right) => right.wealth - left.wealth)
        .slice(0, count)
        .map((entry) => entry.index);
    }
    case "wealthBelow":
      return agents.flatMap((agent, index) =>
        agent.wealth < target.threshold ? [index] : [],
      );
    case "wealthAbove":
      return agents.flatMap((agent, index) =>
        agent.wealth > target.threshold ? [index] : [],
      );
    case "talentAbove":
      return agents.flatMap((agent, index) =>
        agent.talent > target.threshold ? [index] : [],
      );
    case "highTalentLowWealth":
      return agents.flatMap((agent, index) =>
        agent.talent >= target.talentThreshold &&
        agent.wealth <= target.wealthCeiling
          ? [index]
          : [],
      );
    case "bankruptAgents":
      return agents.flatMap((agent, index) =>
        agent.bankruptCount >= target.minBankruptCount ? [index] : [],
      );
  }
}

function matchesCondition(agent: Agent, condition: CompiledCondition) {
  switch (condition.kind) {
    case "wealthBelow":
      return agent.wealth < condition.threshold;
    case "wealthAbove":
      return agent.wealth > condition.threshold;
    case "talentBelow":
      return agent.talent < condition.threshold;
    case "talentAbove":
      return agent.talent > condition.threshold;
    case "rescuedCountBelow":
      return agent.rescuedCount < condition.maxRescuedCount;
    case "bankruptCountAtLeast":
      return agent.bankruptCount >= condition.minBankruptCount;
  }
}

function collectModifierValue<T extends CompiledModifier["kind"]>(
  modifiers: CompiledModifier[],
  kind: T,
) {
  return modifiers.filter(
    (modifier): modifier is Extract<CompiledModifier, { kind: T }> =>
      modifier.kind === kind,
  );
}

function sortByPriority(indices: number[], agents: Agent[], modifiers: CompiledModifier[]) {
  const priorityModifiers = collectModifierValue(modifiers, "priorityScoreWeight");

  if (priorityModifiers.length === 0) {
    return indices;
  }

  const weights = priorityModifiers.reduce(
    (accumulator, modifier) => ({
      talentWeight: accumulator.talentWeight + modifier.talentWeight,
      wealthWeight: accumulator.wealthWeight + modifier.wealthWeight,
      bankruptWeight: accumulator.bankruptWeight + modifier.bankruptWeight,
    }),
    {
      talentWeight: 0,
      wealthWeight: 0,
      bankruptWeight: 0,
    },
  );

  const maxWealth = Math.max(1, ...agents.map((agent) => agent.wealth));
  const maxBankruptCount = Math.max(1, ...agents.map((agent) => agent.bankruptCount));

  return [...indices].sort((leftIndex, rightIndex) => {
    const left = agents[leftIndex];
    const right = agents[rightIndex];
    const leftScore =
      left.talent * weights.talentWeight +
      (left.wealth / maxWealth) * weights.wealthWeight +
      (left.bankruptCount / maxBankruptCount) * weights.bankruptWeight;
    const rightScore =
      right.talent * weights.talentWeight +
      (right.wealth / maxWealth) * weights.wealthWeight +
      (right.bankruptCount / maxBankruptCount) * weights.bankruptWeight;

    return rightScore - leftScore;
  });
}

function applyRecipientLimit(indices: number[], modifiers: CompiledModifier[]) {
  const recipientLimits = collectModifierValue(modifiers, "maxRecipients");

  if (recipientLimits.length === 0) {
    return indices;
  }

  const maxRecipients = Math.min(...recipientLimits.map((modifier) => modifier.count));
  return indices.slice(0, maxRecipients);
}

function getBudgetCap(modifiers: CompiledModifier[]) {
  const budgetCaps = collectModifierValue(modifiers, "budgetCap");

  if (budgetCaps.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.min(...budgetCaps.map((modifier) => modifier.maxBudget));
}

function getWeightMultiplier(modifiers: CompiledModifier[]) {
  return collectModifierValue(modifiers, "weightMultiplier").reduce(
    (accumulator, modifier) => accumulator * modifier.value,
    1,
  );
}

function addSpend(summary: PolicyApplicationSummary, amount: number) {
  return {
    ...summary,
    netCost: summary.netCost + amount,
    grossSpend: summary.grossSpend + amount,
  };
}

function addRevenue(summary: PolicyApplicationSummary, amount: number) {
  return {
    ...summary,
    netCost: summary.netCost - amount,
    grossRevenue: summary.grossRevenue + amount,
  };
}

type EffectApplicationResult = {
  agents: Agent[];
  summary: PolicyApplicationSummary;
  remainingBudget: number;
  didApply: boolean;
};

function applyPositiveTransfers(
  agents: Agent[],
  recipientIndices: number[],
  summary: PolicyApplicationSummary,
  amountResolver: (agent: Agent) => number,
  mutateAgent: (agent: Agent, amount: number) => Agent,
  remainingBudget: number,
): EffectApplicationResult {
  let budget = remainingBudget;
  let didApply = false;
  let nextSummary = summary;
  const nextAgents = [...agents];

  recipientIndices.forEach((index) => {
    const agent = nextAgents[index];
    const amount = amountResolver(agent);

    if (amount <= 0 || amount > budget) {
      return;
    }

    nextAgents[index] = mutateAgent(agent, amount);
    budget -= amount;
    didApply = true;
    nextSummary = addSpend(nextSummary, amount);
  });

  return {
    agents: nextAgents,
    summary: nextSummary,
    remainingBudget: budget,
    didApply,
  };
}

function applyEffect(
  agents: Agent[],
  effect: CompiledEffect,
  recipientIndices: number[],
  summary: PolicyApplicationSummary,
  remainingBudget: number,
  weightMultiplier: number,
  config: SimulationConfig,
): EffectApplicationResult {
  switch (effect.kind) {
    case "grantAmount": {
      const amount = effect.amount * weightMultiplier;

      return applyPositiveTransfers(
        agents,
        recipientIndices,
        summary,
        () => amount,
        (agent, appliedAmount) => ({
          ...agent,
          wealth: agent.wealth + appliedAmount,
          lastWealthDelta: agent.lastWealthDelta + appliedAmount,
        }),
        remainingBudget,
      );
    }
    case "setWealthFloor": {
      const minimumWealth = effect.minimumWealth * weightMultiplier;

      return applyPositiveTransfers(
        agents,
        recipientIndices,
        summary,
        (agent) => Math.max(0, minimumWealth - agent.wealth),
        (agent, appliedAmount) => ({
          ...agent,
          wealth: agent.wealth + appliedAmount,
          lastWealthDelta: agent.lastWealthDelta + appliedAmount,
          rescuedCount: agent.rescuedCount + 1,
        }),
        remainingBudget,
      );
    }
    case "bailout": {
      const amount = effect.amount * weightMultiplier;

      return applyPositiveTransfers(
        agents,
        recipientIndices,
        summary,
        (agent) =>
          agent.wealth <= effect.triggerWealth && agent.rescuedCount < effect.maxPerAgent
            ? amount
            : 0,
        (agent, appliedAmount) => ({
          ...agent,
          wealth: agent.wealth + appliedAmount,
          lastWealthDelta: agent.lastWealthDelta + appliedAmount,
          rescuedCount: agent.rescuedCount + 1,
        }),
        remainingBudget,
      );
    }
    case "talentGrant": {
      const amount = effect.amount * weightMultiplier;

      return applyPositiveTransfers(
        agents,
        recipientIndices,
        summary,
        (agent) =>
          agent.talent >= effect.talentThreshold && agent.wealth <= effect.wealthCeiling
            ? amount
            : 0,
        (agent, appliedAmount) => ({
          ...agent,
          wealth: agent.wealth + appliedAmount,
          lastWealthDelta: agent.lastWealthDelta + appliedAmount,
        }),
        remainingBudget,
      );
    }
    case "wealthTax": {
      const rate = Math.max(0, Math.min(1, effect.rate * weightMultiplier));
      let totalRevenue = 0;
      let didApply = false;
      const nextAgents = agents.map((agent, index) => {
        if (!recipientIndices.includes(index)) {
          return agent;
        }

        const taxableWealth = Math.max(0, agent.wealth - effect.threshold);
        const tax = taxableWealth * rate;

        if (tax <= 0) {
          return agent;
        }

        didApply = true;
        totalRevenue += tax;

        return {
          ...agent,
          wealth: Math.max(config.population.wealthFloor, agent.wealth - tax),
          lastWealthDelta: agent.lastWealthDelta - tax,
        };
      });

      return {
        agents: nextAgents,
        summary: totalRevenue > 0 ? addRevenue(summary, totalRevenue) : summary,
        remainingBudget,
        didApply,
      };
    }
    case "progressiveTax": {
      const scaledBrackets = effect.brackets.map((bracket) => ({
        threshold: bracket.threshold,
        rate: Math.max(0, Math.min(1, bracket.rate * weightMultiplier)),
      }));

      let totalRevenue = 0;
      let didApply = false;
      const nextAgents = agents.map((agent, index) => {
        if (!recipientIndices.includes(index)) {
          return agent;
        }

        const tax = calculateProgressiveTax(agent.wealth, scaledBrackets);

        if (tax <= 0) {
          return agent;
        }

        didApply = true;
        totalRevenue += tax;

        return {
          ...agent,
          wealth: Math.max(config.population.wealthFloor, agent.wealth - tax),
          lastWealthDelta: agent.lastWealthDelta - tax,
        };
      });

      return {
        agents: nextAgents,
        summary: totalRevenue > 0 ? addRevenue(summary, totalRevenue) : summary,
        remainingBudget,
        didApply,
      };
    }
  }
}

function applyRule(
  agents: Agent[],
  rule: CompiledComposerRule,
  config: SimulationConfig,
  summary: PolicyApplicationSummary,
): PolicyApplicationResult {
  const targetedIndices = selectTargetIndices(agents, rule.target);
  const filteredIndices = targetedIndices.filter((index) =>
    rule.conditions.every((condition) => matchesCondition(agents[index], condition)),
  );
  const prioritizedIndices = sortByPriority(filteredIndices, agents, rule.modifiers);
  const recipientIndices = applyRecipientLimit(prioritizedIndices, rule.modifiers);
  const weightMultiplier = getWeightMultiplier(rule.modifiers);
  let remainingBudget = getBudgetCap(rule.modifiers);
  let nextAgents = agents;
  let nextSummary = summary;
  let didApply = false;

  rule.effects.forEach((effect) => {
    const result = applyEffect(
      nextAgents,
      effect,
      recipientIndices,
      nextSummary,
      remainingBudget,
      weightMultiplier,
      config,
    );

    nextAgents = result.agents;
    nextSummary = result.summary;
    remainingBudget = result.remainingBudget;
    didApply ||= result.didApply;
  });

  return {
    agents: nextAgents,
    summary: didApply ? appendAppliedRule(nextSummary, rule.id) : nextSummary,
  };
}

export function applyComposerRules(
  agents: Agent[],
  rules: CompiledComposerRule[],
  config: SimulationConfig,
  step: number,
): PolicyApplicationResult {
  const eligibleRules = rules.filter((rule) => shouldApplyRule(rule, step, config));

  if (eligibleRules.length === 0) {
    return {
      agents,
      summary: createEmptySummary(),
    };
  }

  return eligibleRules.reduce<PolicyApplicationResult>(
    (result, rule) => applyRule(result.agents, rule, config, result.summary),
    {
      agents,
      summary: createEmptySummary(),
    },
  );
}
