import type { SimulationConfig } from "@/types/config";
import type {
  Policy,
  PolicyApplicationResult,
  PolicyApplicationSummary,
  ProgressiveTaxPolicy,
} from "@/types/policies";
import type { Agent } from "@/types/simulation";

function shouldApplyPolicy(
  policy: Policy,
  step: number,
  config: SimulationConfig,
): boolean {
  if (!policy.enabled) {
    return false;
  }

  if (policy.cadence === "step") {
    return true;
  }

  return step % config.economy.yearInterval === 0;
}

function createEmptySummary(): PolicyApplicationSummary {
  return {
    netCost: 0,
    grossSpend: 0,
    grossRevenue: 0,
    appliedPolicyIds: [],
  };
}

function addSpend(
  summary: PolicyApplicationSummary,
  amount: number,
): PolicyApplicationSummary {
  return {
    ...summary,
    netCost: summary.netCost + amount,
    grossSpend: summary.grossSpend + amount,
  };
}

function addRevenue(
  summary: PolicyApplicationSummary,
  amount: number,
): PolicyApplicationSummary {
  return {
    ...summary,
    netCost: summary.netCost - amount,
    grossRevenue: summary.grossRevenue + amount,
  };
}

function markPolicyApplied(
  summary: PolicyApplicationSummary,
  policyId: string,
): PolicyApplicationSummary {
  return {
    ...summary,
    appliedPolicyIds: [...summary.appliedPolicyIds, policyId],
  };
}

function applyBasicIncome(
  agents: Agent[],
  policy: Extract<Policy, { type: "basicIncome" }>,
  summary: PolicyApplicationSummary,
): PolicyApplicationResult {
  const nextAgents = agents.map((agent) => ({
    ...agent,
    wealth: agent.wealth + policy.amount,
    lastWealthDelta: agent.lastWealthDelta + policy.amount,
  }));

  return {
    agents: nextAgents,
    summary: addSpend(
      markPolicyApplied(summary, policy.id),
      policy.amount * agents.length,
    ),
  };
}

function applyWealthTax(
  agents: Agent[],
  policy: Extract<Policy, { type: "wealthTax" }>,
  config: SimulationConfig,
  summary: PolicyApplicationSummary,
): PolicyApplicationResult {
  let totalRevenue = 0;
  const nextAgents = agents.map((agent) => {
    const taxableWealth = Math.max(0, agent.wealth - policy.threshold);
    const tax = taxableWealth * policy.rate;
    totalRevenue += tax;

    const nextWealth = Math.max(
      config.population.wealthFloor,
      agent.wealth - tax,
    );

    return {
      ...agent,
      wealth: nextWealth,
      lastWealthDelta: agent.lastWealthDelta - tax,
    };
  });

  return {
    agents: nextAgents,
    summary: addRevenue(markPolicyApplied(summary, policy.id), totalRevenue),
  };
}

function calculateProgressiveTax(
  wealth: number,
  policy: ProgressiveTaxPolicy,
): number {
  const brackets = [...policy.brackets].sort(
    (left, right) => left.threshold - right.threshold,
  );

  let tax = 0;

  brackets.forEach((bracket, index) => {
    if (wealth <= bracket.threshold) {
      return;
    }

    const nextThreshold = brackets[index + 1]?.threshold ?? wealth;
    const upperBound = Math.min(wealth, nextThreshold);
    const taxableAmount = Math.max(0, upperBound - bracket.threshold);
    tax += taxableAmount * bracket.rate;
  });

  return tax;
}

function applyProgressiveTax(
  agents: Agent[],
  policy: Extract<Policy, { type: "progressiveTax" }>,
  config: SimulationConfig,
  summary: PolicyApplicationSummary,
): PolicyApplicationResult {
  let totalRevenue = 0;
  const nextAgents = agents.map((agent) => {
    const tax = calculateProgressiveTax(agent.wealth, policy);
    totalRevenue += tax;

    return {
      ...agent,
      wealth: Math.max(config.population.wealthFloor, agent.wealth - tax),
      lastWealthDelta: agent.lastWealthDelta - tax,
    };
  });

  return {
    agents: nextAgents,
    summary: addRevenue(markPolicyApplied(summary, policy.id), totalRevenue),
  };
}

function applyBankruptcyFloor(
  agents: Agent[],
  policy: Extract<Policy, { type: "bankruptcyFloor" }>,
  summary: PolicyApplicationSummary,
): PolicyApplicationResult {
  let totalSpend = 0;
  const nextAgents = agents.map((agent) => {
    if (agent.wealth >= policy.minimumWealth) {
      return agent;
    }

    const rescueAmount = policy.minimumWealth - agent.wealth;
    totalSpend += rescueAmount;

    return {
      ...agent,
      wealth: policy.minimumWealth,
      lastWealthDelta: agent.lastWealthDelta + rescueAmount,
      rescuedCount: agent.rescuedCount + 1,
    };
  });

  return {
    agents: nextAgents,
    summary: addSpend(markPolicyApplied(summary, policy.id), totalSpend),
  };
}

function applyBailout(
  agents: Agent[],
  policy: Extract<Policy, { type: "bailout" }>,
  summary: PolicyApplicationSummary,
): PolicyApplicationResult {
  let totalSpend = 0;
  const nextAgents = agents.map((agent) => {
    if (
      agent.wealth > policy.triggerWealth ||
      agent.rescuedCount >= policy.maxPerAgent
    ) {
      return agent;
    }

    totalSpend += policy.amount;

    return {
      ...agent,
      wealth: agent.wealth + policy.amount,
      lastWealthDelta: agent.lastWealthDelta + policy.amount,
      rescuedCount: agent.rescuedCount + 1,
    };
  });

  return {
    agents: nextAgents,
    summary: addSpend(markPolicyApplied(summary, policy.id), totalSpend),
  };
}

function applyTalentGrant(
  agents: Agent[],
  policy: Extract<Policy, { type: "talentGrant" }>,
  summary: PolicyApplicationSummary,
): PolicyApplicationResult {
  let totalSpend = 0;
  const nextAgents = agents.map((agent) => {
    if (
      agent.talent < policy.talentThreshold ||
      agent.wealth > policy.wealthCeiling
    ) {
      return agent;
    }

    totalSpend += policy.amount;

    return {
      ...agent,
      wealth: agent.wealth + policy.amount,
      lastWealthDelta: agent.lastWealthDelta + policy.amount,
    };
  });

  return {
    agents: nextAgents,
    summary: addSpend(markPolicyApplied(summary, policy.id), totalSpend),
  };
}

export function applyPolicies(
  agents: Agent[],
  policies: Policy[],
  config: SimulationConfig,
  step: number,
): PolicyApplicationResult {
  const eligiblePolicies = policies.filter((policy) =>
    shouldApplyPolicy(policy, step, config),
  );

  if (eligiblePolicies.length === 0) {
    return {
      agents,
      summary: createEmptySummary(),
    };
  }

  return eligiblePolicies.reduce<PolicyApplicationResult>(
    (result, policy) => {
      switch (policy.type) {
        case "basicIncome":
          return applyBasicIncome(result.agents, policy, result.summary);
        case "wealthTax":
          return applyWealthTax(
            result.agents,
            policy,
            config,
            result.summary,
          );
        case "progressiveTax":
          return applyProgressiveTax(
            result.agents,
            policy,
            config,
            result.summary,
          );
        case "bankruptcyFloor":
          return applyBankruptcyFloor(result.agents, policy, result.summary);
        case "bailout":
          return applyBailout(result.agents, policy, result.summary);
        case "talentGrant":
          return applyTalentGrant(result.agents, policy, result.summary);
      }
    },
    {
      agents,
      summary: createEmptySummary(),
    },
  );
}
