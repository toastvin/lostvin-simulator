import type { ComposerBlock, ComposerBlockDefinition } from "@/types/composer";
import type { ConfigFieldDefinition } from "@/types/config";
import type { ComparisonCard } from "@/types/metrics";
import type { PolicyPreset, PolicyTypeDefinition } from "@/types/policies";
import type { SimulationStatus } from "@/types/simulation";

export type Language = "ko" | "en";

export const DEFAULT_LANGUAGE: Language = "ko";

const koTranslations: Record<string, string> = {
  "Phase 10 scratch-style policy canvas": "Phase 10 스크래치 스타일 정책 캔버스",
  "Run the baseline, arrange policy logic on a canvas, and compare the outcome on the same world.":
    "기본 세계를 실행하고, 캔버스에서 정책 로직을 배치한 뒤, 같은 세계에서 결과를 비교하세요.",
  "The app now supports the full guided flow: choose a seed, start from a preset or import it into the canvas editor, apply the draft on reset, and read the result through same-seed comparison charts.":
    "이제 앱은 전체 탐색 흐름을 지원합니다. 시드를 고르고, 프리셋에서 시작하거나 캔버스 편집기로 가져오고, 리셋 시 초안을 적용한 뒤, 동일 시드 비교 차트로 결과를 읽을 수 있습니다.",
  "Open Canvas": "캔버스 열기",
  "Compare Outcome": "결과 비교",
  "Scratch-style Canvas": "스크래치 스타일 캔버스",
  "Visitors can now move rule frames freely and snap policy blocks into target, condition, effect, and modifier lanes.":
    "이제 방문자는 규칙 프레임을 자유롭게 움직이고, 정책 블록을 대상, 조건, 효과, 보정 레인에 배치할 수 있습니다.",
  "Same-Seed Fairness": "동일 시드 공정 비교",
  "Baseline and policy runs can now be aligned on the same seed, which is the only fair way to compare outcomes.":
    "이제 기준선과 정책 실행을 같은 시드로 맞출 수 있어, 결과를 공정하게 비교할 수 있습니다.",
  "Extensible Control Surface": "확장 가능한 제어 인터페이스",
  "Both simulation variables and rule parameters are driven by metadata, so future controls can expand without rewriting the page structure.":
    "시뮬레이션 변수와 규칙 파라미터가 모두 메타데이터 기반이라, 앞으로 제어 항목이 늘어나도 페이지 구조를 다시 짤 필요가 없습니다.",
  "Active run controls": "현재 실행 제어",
  "Start, pause, or replay the currently applied world.":
    "현재 적용된 세계를 시작, 일시정지, 재실행할 수 있습니다.",
  "Draft changes live in the setup panel. This card only controls the world that is already applied and currently running on the canvas.":
    "초안 변경은 설정 패널에서 관리됩니다. 이 카드에서는 이미 적용되어 캔버스에서 실행 중인 세계만 제어합니다.",
  "Run Active World": "현재 세계 실행",
  Resume: "재개",
  Pause: "일시정지",
  "Replay Active Seed": "현재 시드 다시 실행",
  Status: "상태",
  Seed: "시드",
  "Runtime Step": "실행 스텝",
  "Snapshot captured at step": "스냅샷 캡처 시점",
  "Avg Wealth": "평균 자산",
  Population: "인구",
  "Mean Happiness": "평균 행복도",
  "Visualized by agent color": "에이전트 색상으로 시각화",
  idle: "대기",
  running: "실행 중",
  paused: "일시정지",
  "Visitors can now move from block lists to a free-position rule canvas.":
    "이제 방문자는 블록 목록에서 자유 배치 규칙 캔버스로 이동할 수 있습니다.",
  "Start with the baseline world, then keep the seed fixed while you change the policy preset, edit raw rules, use the scratch-style canvas, or adjust simulation variables.":
    "기본 세계에서 시작한 뒤, 시드를 고정한 상태로 정책 프리셋을 바꾸고, 원시 규칙을 수정하고, 스크래치 스타일 캔버스를 쓰거나, 시뮬레이션 변수를 조정하세요.",
  "The comparison only means anything when the seed stays the same. That isolates rule changes from random initialization noise.":
    "비교는 시드가 같을 때만 의미가 있습니다. 그래야 규칙 변경 효과를 무작위 초기화 잡음과 분리할 수 있습니다.",
  "Draft values do nothing until you press": "초안 값은",
  "Apply + Reset": "적용 + 리셋",
  "That keeps the running engine stable while you prepare the next experiment.":
    "를 누르기 전까지는 적용되지 않습니다. 덕분에 다음 실험을 준비하는 동안 실행 중인 엔진이 안정적으로 유지됩니다.",
  "Experiment Setup": "실험 설정",
  "Prepare the next run before you reset the world.":
    "세계를 리셋하기 전에 다음 실행을 준비하세요.",
  "Draft seed, draft preset, and draft variables can diverge from the currently running simulation. The active world only changes on reset.":
    "초안 시드, 초안 프리셋, 초안 변수는 현재 실행 중인 시뮬레이션과 달라도 됩니다. 활성 세계는 리셋할 때만 바뀝니다.",
  Active: "활성",
  "Custom Run": "사용자 지정 실행",
  "Draft differs from active run": "초안이 현재 실행과 다름",
  "Draft matches active run": "초안이 현재 실행과 같음",
  "Draft seed": "초안 시드",
  "Active seed": "활성 시드",
  "Keep this fixed when comparing baseline against a preset. Change it only when you want a new world sample.":
    "기준선과 프리셋을 비교할 때는 이것을 고정하세요. 새로운 세계 샘플이 필요할 때만 변경하세요.",
  "Apply Rules": "규칙 적용",
  "Reset Active Run": "현재 실행 리셋",
  "Draft preset": "초안 프리셋",
  "Active preset": "활성 프리셋",
  "Custom Draft": "사용자 지정 초안",
  "Validation Errors": "검증 오류",
  "Policy Errors": "정책 오류",
  "Composer Errors": "컴포저 오류",
  Warnings: "경고",
  "Policy Warnings": "정책 경고",
  "Composer Warnings": "컴포저 경고",
  "Normalization Notes": "정규화 메모",
  "Composer Compile Notes": "컴포저 컴파일 메모",
  "Policy Presets": "정책 프리셋",
  "Choose a policy package, or use it as a starting point for custom rules.":
    "정책 패키지를 선택하거나, 사용자 지정 규칙의 출발점으로 사용하세요.",
  "Presets still give fast comparisons, but now they also act as launchpads for the raw rule builder and the visual composer below.":
    "프리셋은 여전히 빠른 비교를 제공하고, 이제 아래의 원시 규칙 빌더와 비주얼 컴포저의 출발점 역할도 합니다.",
  Draft: "초안",
  "Loaded In Draft": "초안에 로드됨",
  "Use As Draft": "초안으로 사용",
  "Phase 9 Vertical Composer Fallback": "Phase 9 세로 컴포저 대체 경로",
  "Keep the structured vertical composer when the canvas is too heavy.":
    "캔버스가 너무 무거울 때는 구조화된 세로 컴포저를 사용하세요.",
  "This remains useful on smaller screens or when you want a simpler semantic editor without free-position layout.":
    "작은 화면이거나 자유 배치 없이 더 단순한 의미 기반 편집기를 원할 때 여전히 유용합니다.",
  fields: "필드",
  "How many agents exist, what they start with, and where bankruptcy begins.":
    "에이전트 수, 시작 자산, 파산 기준을 설정합니다.",
  Arena: "공간",
  "World size for movement and collisions.": "이동과 충돌이 일어나는 세계 크기입니다.",
  Movement: "이동",
  "Base speed and pace profile for agents and event nodes.":
    "에이전트와 이벤트 노드의 기본 속도와 이동 프로필입니다.",
  "Luck Events": "행운 이벤트",
  "How often luck and bad luck appear, and how large each shock is.":
    "행운과 불운이 얼마나 자주 나타나는지, 각 충격이 얼마나 큰지 설정합니다.",
  Economy: "경제",
  "Compounding and yearly return rules that amplify long-term differences.":
    "장기 격차를 키우는 복리와 연간 수익 규칙입니다.",
  Happiness: "행복도",
  "How wealth, trends, and bankruptcy penalties map into visible wellbeing.":
    "자산, 변화 추세, 파산 패널티가 체감 행복도로 어떻게 반영되는지 설정합니다.",
  Policies: "정책",
  "Policy controls are driven by presets in this phase.":
    "이 단계의 정책 제어는 프리셋 중심으로 동작합니다.",
  Advanced: "고급",
  "Reserved for future variables and experimental controls.":
    "향후 변수와 실험적 제어 항목을 위해 남겨 둔 영역입니다.",
  On: "켜짐",
  Off: "꺼짐",
  "Reset to apply": "리셋 시 적용",
  Live: "즉시 적용",
  "No intervention. Use this to observe the baseline world with the same seed.":
    "개입 없음. 동일한 시드에서 기준 세계를 관찰할 때 사용합니다.",
  "Phase 6 stats and comparison": "Phase 6 통계 및 비교",
  "The runtime now emits readable policy evidence instead of raw motion.":
    "이제 런타임은 단순한 움직임이 아니라 읽을 수 있는 정책 근거를 제공합니다.",
  "Statistical aggregation is throttled to a 500ms capture interval, so charts stay decoupled from the 100ms engine loop. The live canvas can keep moving while KPIs and comparison snapshots remain stable.":
    "통계 집계는 500ms 간격으로 제한되어 차트가 100ms 엔진 루프와 분리됩니다. 라이브 캔버스는 계속 움직이면서도 KPI와 비교 스냅샷은 안정적으로 유지됩니다.",
  Gini: "지니계수",
  "Lower means wealth is distributed more evenly.":
    "낮을수록 자산 분배가 더 고르게 이루어집니다.",
  "Poverty Rate": "빈곤율",
  "Share of agents at or below the effective wealth floor.":
    "실질 자산 하한선 이하에 있는 에이전트 비율입니다.",
  "Bankruptcy Rate": "파산율",
  "Share of agents who have crossed into bankruptcy at least once.":
    "한 번 이상 파산 상태를 겪은 에이전트 비율입니다.",
  "Policy Cost": "정책 비용",
  "Positive is spend. Negative indicates net revenue from taxes.":
    "양수는 지출, 음수는 세금으로 인한 순수입을 의미합니다.",
  "Captured metrics currently at step": "현재 캡처된 지표 시점",
  "Baseline vs Policy": "기준선 vs 정책",
  "Same seed, same world, different rules.": "같은 시드, 같은 세계, 다른 규칙.",
  "Delta cards below compare the active policy run against the no-policy baseline initialized from the same seed.":
    "아래 변화 카드들은 동일한 시드에서 초기화한 무정책 기준선과 현재 정책 실행을 비교합니다.",
  "Comparison Locked": "비교 잠금",
  "Baseline snapshots are ready, but no policy set is applied yet.":
    "기준선 스냅샷은 준비됐지만 아직 정책 세트가 적용되지 않았습니다.",
  "Use the control studio above, keep the seed fixed, then press Apply + Reset. Presets and custom rules both feed this same-seed comparison surface.":
    "위의 컨트롤 스튜디오에서 시드를 고정한 뒤 `적용 + 리셋`을 누르세요. 프리셋과 사용자 지정 규칙 모두 이 동일 시드 비교 화면으로 연결됩니다.",
  "Chart mounts on the client after layout is measured.":
    "차트는 레이아웃 측정 후 클라이언트에서 렌더링됩니다.",
  Baseline: "기준선",
  Trend: "추세",
  "Core KPI trajectory": "핵심 KPI 추세",
  "Average wealth is plotted against happiness and inequality snapshots captured every five ticks.":
    "평균 자산을 행복도 및 5틱마다 캡처한 불평등 스냅샷과 함께 표시합니다.",
  "Average wealth": "평균 자산",
  "Mean happiness": "평균 행복도",
  "Gini (%)": "지니계수(%)",
  Distribution: "분포",
  "Wealth histogram": "자산 히스토그램",
  "Distribution bins are derived from the captured agent state, not from the canvas render path.":
    "분포 구간은 캔버스 렌더 경로가 아니라 캡처된 에이전트 상태에서 계산됩니다.",
  Scatter: "산포",
  "Talent vs wealth": "재능 vs 자산",
  "Each dot is an agent snapshot. Bubble size tracks happiness so upward mobility and welfare can be read together.":
    "각 점은 에이전트 스냅샷입니다. 버블 크기는 행복도를 나타내므로 상승 이동성과 복지 상태를 함께 읽을 수 있습니다.",
  Talent: "재능",
  Wealth: "자산",
  Comparison: "비교",
  "Policy run against baseline": "기준선 대비 정책 실행",
  "Once a policy set is applied, inequality, poverty, and happiness lines stay paired to the same seed for fair comparison.":
    "정책 세트가 적용되면 불평등, 빈곤, 행복도 선이 동일 시드에 맞춰져 공정 비교가 가능합니다.",
  "Current happiness": "현재 행복도",
  "Baseline happiness": "기준선 행복도",
  "Current gini (%)": "현재 지니계수(%)",
  "Baseline gini (%)": "기준선 지니계수(%)",
  "Apply a preset or custom rule set from the control panel with the same seed to unlock paired baseline history.":
    "컨트롤 패널에서 동일 시드의 프리셋 또는 사용자 지정 규칙 세트를 적용하면 짝지어진 기준선 이력이 열립니다.",
  "Scratch-style Policy Canvas": "스크래치 스타일 정책 캔버스",
  "Move rule frames freely, then snap policy blocks into semantic lanes.":
    "규칙 프레임을 자유롭게 움직이고, 정책 블록을 의미 레인에 배치하세요.",
  "The canvas gives a stronger visual programming feel, but execution still comes from the same typed composer AST. Layout stays visual. Meaning stays semantic.":
    "이 캔버스는 더 강한 비주얼 프로그래밍 감각을 주지만, 실행은 여전히 동일한 타입 기반 컴포저 AST에서 나옵니다. 레이아웃은 시각적이고, 의미는 구조적으로 유지됩니다.",
  frames: "프레임",
  "Add Rule Frame": "규칙 프레임 추가",
  "Import Draft Policies": "초안 정책 가져오기",
  "Sync From Composer": "컴포저에서 동기화",
  "Reset Layout": "레이아웃 초기화",
  "Zoom In": "확대",
  "Zoom Out": "축소",
  "Pan Up": "위로 이동",
  "Pan Left": "왼쪽으로 이동",
  "Pan Right": "오른쪽으로 이동",
  "Pan Down": "아래로 이동",
  "Reset View": "보기 초기화",
  "Distribute X": "가로 분산",
  "Tidy Layout": "레이아웃 정리",
  "Copy Canvas JSON": "캔버스 JSON 복사",
  "Download Canvas": "캔버스 다운로드",
  "Canvas Errors": "캔버스 오류",
  "Canvas Warnings": "캔버스 경고",
  "Compile Notes": "컴파일 메모",
  Palette: "팔레트",
  targets: "대상",
  conditions: "조건",
  effects: "효과",
  modifiers: "보정",
  "Canvas Workspace": "캔버스 작업 공간",
  "Drag frame headers to move them, use the right-edge handle to resize width, and use `Esc` or `Delete` for quick selection control. Snap guides, edge auto-pan, and the minimap help when the canvas gets crowded.":
    "프레임 헤더를 드래그해 이동하고, 오른쪽 핸들로 너비를 조절하세요. `Esc`와 `Delete`로 빠르게 선택을 제어할 수 있습니다. 캔버스가 복잡해지면 스냅 가이드, 가장자리 자동 이동, 미니맵이 도움이 됩니다.",
  "Target Lane": "대상 레인",
  "Condition Lane": "조건 레인",
  "Effect Lane": "효과 레인",
  "Modifier Lane": "보정 레인",
  "Drop only matching block categories here.": "해당 레인과 맞는 블록만 이곳에 놓을 수 있습니다.",
  Delete: "삭제",
  "No blocks in this lane yet.": "이 레인에는 아직 블록이 없습니다.",
  "Drag from the palette or move an existing block here.": "팔레트에서 드래그하거나 기존 블록을 이곳으로 옮기세요.",
  "Snap active": "스냅 활성",
  "Free move": "자유 이동",
  Minimap: "미니맵",
  Inspector: "인스펙터",
  "Rule Name": "규칙 이름",
  Enabled: "활성화",
  Cadence: "주기",
  Step: "스텝",
  Year: "연도",
  "Select a block to edit its parameters here.": "블록을 선택하면 여기서 파라미터를 수정할 수 있습니다.",
  "Select a rule frame or block from the canvas.": "캔버스에서 규칙 프레임이나 블록을 선택하세요.",
  "Compiled Preview": "컴파일 미리보기",
  "Canvas JSON": "캔버스 JSON",
  "Visual Policy Composer": "비주얼 정책 컴포저",
  "Build policy logic with constrained blocks instead of raw rule forms.":
    "원시 규칙 폼 대신 제약된 블록으로 정책 로직을 구성하세요.",
  "This stays safer than free-form code. Users can reorder target, condition, effect, and modifier blocks, but the engine still runs a typed JSON AST with validation and compile preview.":
    "자유 입력 코드보다 안전합니다. 사용자는 대상, 조건, 효과, 보정 블록을 재배치할 수 있지만, 엔진은 여전히 검증과 컴파일 미리보기가 가능한 타입 기반 JSON AST를 실행합니다.",
  rules: "규칙",
  "Add Rule": "규칙 추가",
  "Clear Draft": "초안 비우기",
  "Copy JSON": "JSON 복사",
  "Download JSON": "JSON 다운로드",
  "No visual rules yet.": "아직 비주얼 규칙이 없습니다.",
  "Start from scratch or import the current preset-backed policy draft into block form.":
    "처음부터 시작하거나, 현재 프리셋 기반 정책 초안을 블록 형태로 가져오세요.",
  Rule: "규칙",
  "Delete Rule": "규칙 삭제",
  "Add target": "대상 추가",
  "Add condition": "조건 추가",
  "Add effect": "효과 추가",
  "Add modifier": "보정 추가",
  "AST Preview": "AST 미리보기",
  "Rule Builder": "규칙 빌더",
  "Build a constrained custom policy package without writing code.":
    "코드를 작성하지 않고 제약된 사용자 지정 정책 패키지를 만드세요.",
  "This editor is metadata-driven. New policy types should appear here once their type definition, parameter metadata, and validator are added.":
    "이 편집기는 메타데이터 기반입니다. 새 정책 타입은 타입 정의, 파라미터 메타데이터, 검증기가 추가되면 여기에 자동으로 나타나야 합니다.",
  "Loaded from preset": "프리셋에서 로드됨",
  "Custom draft": "사용자 지정 초안",
  "Add policy type": "추가할 정책 타입",
  "Custom rule draft has blocking errors": "사용자 지정 규칙 초안에 차단 오류가 있습니다",
  "Custom rule draft has warnings": "사용자 지정 규칙 초안에 경고가 있습니다",
  "Invalid rules stay in draft only and cannot be applied until the blocking issues are resolved.":
    "유효하지 않은 규칙은 초안에만 남으며, 차단 오류가 해결되기 전까지 적용할 수 없습니다.",
  "Empty State": "빈 상태",
  "No rules are in the draft yet.": "초안에 아직 규칙이 없습니다.",
  "Start from a preset above or add a single policy type here. The builder uses dropdowns and numeric inputs only, so parsing user code is never needed.":
    "위 프리셋에서 시작하거나 여기서 정책 타입 하나를 추가하세요. 빌더는 드롭다운과 숫자 입력만 사용하므로 사용자 코드를 해석할 필요가 없습니다.",
  "Policy JSON Preview": "정책 JSON 미리보기",
  "This is a debug view of the exact draft policy payload that will be applied on reset.":
    "리셋 시 적용될 정확한 정책 초안 페이로드를 보여주는 디버그 화면입니다.",
  "Rule errors": "규칙 오류",
  "Rule warnings": "규칙 경고",
  Threshold: "기준값",
  Rate: "비율",
  Remove: "삭제",
  "Add Bracket": "구간 추가",
  "Policy id": "정책 ID",
  "Every step": "매 스텝",
  "Every year": "매 연도",
  "This block does not need extra parameters.": "이 블록은 추가 파라미터가 필요하지 않습니다.",
  "Connected canvas draft saved to browser storage.":
    "연결 캔버스 초안을 브라우저 저장소에 저장했습니다.",
  "No browser-saved connected canvas draft is available yet.":
    "브라우저에 저장된 연결 캔버스 초안이 아직 없습니다.",
  "Browser-saved connected canvas draft cleared.":
    "브라우저에 저장된 연결 캔버스 초안을 지웠습니다.",
  "Connected canvas loaded from browser storage.":
    "연결 캔버스를 브라우저 저장소에서 불러왔습니다.",
  "Phase 11 Connected Canvas Hardening": "Phase 11 연결 캔버스 고도화",
  "Edit, delete, save, and navigate the connected policy graph.":
    "연결된 정책 그래프를 편집하고, 삭제하고, 저장하고, 탐색하세요.",
  "Nested groups still edit directly inside the connected workspace, and now the same draft also supports block or group deletion, browser persistence, JSON import or export, and minimap navigation.":
    "중첩 그룹은 여전히 연결 워크스페이스 안에서 직접 편집할 수 있고, 이제 같은 초안에서 블록 또는 그룹 삭제, 브라우저 저장, JSON 가져오기/내보내기, 미니맵 탐색도 지원합니다.",
  nodes: "노드",
  edges: "엣지",
  "Import Phase 10": "Phase 10 가져오기",
  "Reset Connected Draft": "연결 초안 초기화",
  "Copied JSON": "JSON 복사됨",
  "Copy Connected JSON": "연결 JSON 복사",
  "Apply blocked": "적용 차단",
  "Warnings active": "경고 활성",
  "Mobile Fallback": "모바일 대체 경로",
  "Connected canvas stays desktop-first for now.":
    "연결 캔버스는 현재 데스크톱 우선으로 유지됩니다.",
  "On narrow screens, use the scratch-style frame canvas or the vertical composer below. The connected graph editor remains available on larger viewports where edge wiring and nested groups are easier to manage.":
    "좁은 화면에서는 아래의 스크래치 스타일 프레임 캔버스나 세로 컴포저를 사용하세요. 연결 그래프 편집기는 엣지 연결과 중첩 그룹 관리가 쉬운 넓은 화면에서 계속 사용할 수 있습니다.",
  "Refresh Connected Draft": "연결 초안 새로고침",
  "Scratch canvas fallback remains active below": "아래에서 스크래치 캔버스 대체 경로를 계속 사용할 수 있습니다.",
  "Connected Workspace": "연결 워크스페이스",
  "Drag from an output port into a highlighted input port. Dropping onto an occupied single-input slot replaces the old edge.":
    "출력 포트에서 강조된 입력 포트로 드래그하세요. 이미 연결된 단일 입력 슬롯 위에 놓으면 기존 엣지가 교체됩니다.",
  "Nested groups enabled in 11.3": "11.3에서 중첩 그룹 지원",
  "Reconnect mode": "재연결 모드",
  "Connect mode": "연결 모드",
  "choose a highlighted root slot": "강조된 루트 슬롯을 선택하세요",
  "Rule Frame": "규칙 프레임",
  Disabled: "비활성화",
  "No connected source yet": "아직 연결된 소스가 없습니다",
  "Group Container": "그룹 컨테이너",
  children: "하위 항목",
  "Accepts condition children only": "조건 하위 항목만 허용",
  "Accepts effect children only": "효과 하위 항목만 허용",
  "Accepts modifier children only": "보정 하위 항목만 허용",
  Expand: "펼치기",
  Collapse: "접기",
  "Add Nested Group": "중첩 그룹 추가",
  "Release to nest here": "여기에 놓아 중첩",
  "Collapsed summary": "접힌 요약",
  "Nested drop zone ready": "중첩 드롭 영역 준비됨",
  "Empty container": "빈 컨테이너",
  "Nested Children": "중첩 하위 항목",
  "Drop here to nest into this container.": "여기에 놓으면 이 컨테이너 안으로 들어갑니다.",
  "Drop compatible blocks or sub-groups here.":
    "호환되는 블록이나 하위 그룹을 이곳에 놓으세요.",
  "Nested Group": "중첩 그룹",
  "Child Drop Zone": "하위 드롭 영역",
  "Delete Rule Frame": "규칙 프레임 삭제",
  "Delete Group": "그룹 삭제",
  "Delete Block": "블록 삭제",
  "Delete the selected item from the connected draft.": "선택한 항목을 연결 초안에서 삭제합니다.",
  "Import / Export": "가져오기 / 내보내기",
  "Saved Draft": "저장된 초안",
  "Paste JSON here": "여기에 JSON 붙여넣기",
  "Import JSON": "JSON 가져오기",
  "Load Saved Draft": "저장된 초안 불러오기",
  "Clear Saved Draft": "저장된 초안 지우기",
  "Import File": "파일 가져오기",
  "No browser draft saved yet.": "브라우저에 저장된 초안이 아직 없습니다.",
  "Browser draft saved.": "브라우저 초안이 저장되었습니다.",
  "Save to Browser": "브라우저에 저장",
  "Selection Inspector": "선택 인스펙터",
  Unknown: "알 수 없음",
  "Whole population": "전체 인구",
  "At least": "최소",
  Below: "미만",
  Amount: "금액",
  Floor: "하한",
  Cap: "상한",
  Max: "최대",
  "Rule frame": "규칙 프레임",
  "Browser autosave keeps the latest connected draft": "브라우저 자동 저장이 최신 연결 초안을 유지합니다",
  "Imported from preset": "프리셋에서 가져옴",
  "Canvas draft": "캔버스 초안",
  "Canvas applied": "캔버스 적용됨",
  "Custom applied": "사용자 지정 적용됨",
  "Laissez-faire": "자유방임",
  "No policy intervention. Baseline run for comparison.":
    "정책 개입 없음. 비교용 기준선 실행입니다.",
  "Universal Basic Income": "보편 기본소득",
  "Provides a yearly unconditional income to every agent.":
    "모든 에이전트에게 매년 무조건 소득을 지급합니다.",
  "Progressive Tax + Safety Net": "누진세 + 안전망",
  "Taxes top wealth and protects agents near bankruptcy.":
    "상위 자산에 과세하고 파산 직전 에이전트를 보호합니다.",
  "Talent Rescue": "재능 구조",
  "Targets high-talent agents who remain trapped by low wealth.":
    "높은 재능을 가졌지만 낮은 자산에 묶인 에이전트를 지원합니다.",
  "Balanced Welfare State": "균형 복지국가",
  "Mixes redistribution, safety net protection, and targeted recovery support.":
    "재분배, 안전망 보호, 표적 회복 지원을 조합합니다.",
  "Basic Income": "기본소득",
  "Distributes fixed income to every agent on a fixed cadence.":
    "정해진 주기로 모든 에이전트에게 고정 소득을 분배합니다.",
  "Transfer amount per application.": "적용 1회당 이전 금액입니다.",
  "Wealth Tax": "부유세",
  "Taxes wealth above a threshold and reduces concentration at the top.":
    "기준값 이상 자산에 과세해 상위 집중을 완화합니다.",
  "Wealth above this threshold becomes taxable.":
    "이 기준값을 넘는 자산이 과세 대상이 됩니다.",
  "Marginal rate applied to wealth above the threshold.":
    "기준값 초과 자산에 적용되는 한계 세율입니다.",
  "Progressive Tax": "누진세",
  "Taxes wealth progressively with multiple brackets.":
    "여러 구간으로 자산에 누진 과세합니다.",
  Brackets: "구간",
  "Ordered threshold and rate pairs.": "정렬된 기준값-비율 쌍입니다.",
  "Bankruptcy Floor": "파산 하한선",
  "Prevents agents from staying below a minimum wealth threshold.":
    "에이전트가 최소 자산 기준 아래에 머무르지 않도록 합니다.",
  "Minimum Wealth": "최소 자산",
  "Wealth floor enforced after each step.": "각 스텝 이후 적용되는 자산 하한선입니다.",
  Bailout: "구제금",
  "Rescues agents under a trigger wealth until the per-agent limit is used.":
    "트리거 자산 이하 에이전트를 1인당 한도까지 구제합니다.",
  "Trigger Wealth": "트리거 자산",
  "Rescue applies when wealth is less than or equal to this value.":
    "자산이 이 값 이하일 때 구제가 적용됩니다.",
  "Relief amount added on each bailout.": "구제 1회당 추가되는 지원 금액입니다.",
  "Max Per Agent": "1인당 최대 횟수",
  "Maximum bailout count allowed per agent.":
    "에이전트 1인당 허용되는 최대 구제 횟수입니다.",
  "Talent Grant": "재능 장려금",
  "Supports high-talent, low-wealth agents with a targeted yearly grant.":
    "높은 재능과 낮은 자산을 가진 에이전트에게 표적 연간 장려금을 제공합니다.",
  "Talent Threshold": "재능 기준값",
  "Minimum talent required to qualify.": "지원 자격에 필요한 최소 재능 값입니다.",
  "Wealth Ceiling": "자산 상한",
  "Maximum wealth allowed to stay eligible.": "자격 유지를 위해 허용되는 최대 자산입니다.",
  "Grant amount distributed to eligible agents.":
    "자격 있는 에이전트에게 분배되는 장려금입니다.",
  "All Agents": "전체 에이전트",
  "Apply the rule to the whole population.": "규칙을 전체 인구에 적용합니다.",
  "Bottom Wealth Percent": "하위 자산 비율",
  "Target the poorest share of the population.": "인구 중 가장 가난한 비율을 대상으로 합니다.",
  Percent: "비율",
  "Population share to include.": "포함할 인구 비율입니다.",
  "Top Wealth Percent": "상위 자산 비율",
  "Target the richest share of the population.": "인구 중 가장 부유한 비율을 대상으로 합니다.",
  "Wealth Below": "자산 이하",
  "Target agents under a wealth threshold.": "자산 기준값 이하의 에이전트를 대상으로 합니다.",
  "Maximum wealth allowed into the target set.": "대상 집합에 포함될 수 있는 최대 자산입니다.",
  "Wealth Above": "자산 이상",
  "Target agents above a wealth threshold.": "자산 기준값 이상의 에이전트를 대상으로 합니다.",
  "Minimum wealth required for inclusion.": "포함을 위한 최소 자산입니다.",
  "Talent Above": "재능 이상",
  "Target agents with talent above a threshold.": "재능 기준값 이상의 에이전트를 대상으로 합니다.",
  "High Talent + Low Wealth": "높은 재능 + 낮은 자산",
  "Target talented agents that remain poor.": "재능이 높지만 가난한 에이전트를 대상으로 합니다.",
  "Previously Bankrupt Agents": "파산 이력 에이전트",
  "Target agents with a bankruptcy history.": "파산 이력이 있는 에이전트를 대상으로 합니다.",
  "Minimum Bankrupt Count": "최소 파산 횟수",
  "Minimum bankruptcy count required.": "필요한 최소 파산 횟수입니다.",
  "Condition: Wealth Below": "조건: 자산 이하",
  "Keep only agents whose wealth is below the threshold.":
    "자산이 기준값 이하인 에이전트만 남깁니다.",
  "Condition: Wealth Above": "조건: 자산 이상",
  "Keep only agents whose wealth is above the threshold.":
    "자산이 기준값 이상인 에이전트만 남깁니다.",
  "Condition: Talent Below": "조건: 재능 이하",
  "Keep only agents whose talent is below the threshold.":
    "재능이 기준값 이하인 에이전트만 남깁니다.",
  "Maximum talent allowed.": "허용되는 최대 재능 값입니다.",
  "Condition: Talent Above": "조건: 재능 이상",
  "Keep only agents whose talent is above the threshold.":
    "재능이 기준값 이상인 에이전트만 남깁니다.",
  "Rescue Count Below": "구제 횟수 미만",
  "Keep only agents with rescue counts below the cap.":
    "구제 횟수가 상한 미만인 에이전트만 남깁니다.",
  "Max Rescued Count": "최대 구제 횟수",
  "Maximum rescue count allowed.": "허용되는 최대 구제 횟수입니다.",
  "Bankrupt Count At Least": "파산 횟수 이상",
  "Keep only agents with at least this many bankruptcies.":
    "이 횟수 이상 파산한 에이전트만 남깁니다.",
  "Grant Fixed Amount": "고정 금액 지급",
  "Give selected agents a direct transfer.": "선택된 에이전트에게 직접 이전금을 지급합니다.",
  "Transfer amount.": "이전 금액입니다.",
  "Apply Wealth Tax": "부유세 적용",
  "Tax selected agents above a threshold.":
    "선택된 에이전트의 기준값 초과 자산에 과세합니다.",
  "Taxable wealth begins above this value.": "이 값 초과 자산부터 과세됩니다.",
  "Marginal tax rate.": "한계 세율입니다.",
  "Apply Progressive Tax": "누진세 적용",
  "Tax selected agents using progressive brackets.":
    "선택된 에이전트에게 누진 구간을 적용해 과세합니다.",
  "Set Wealth Floor": "자산 하한 설정",
  "Raise selected agents up to a minimum wealth level.":
    "선택된 에이전트의 자산을 최소 수준까지 끌어올립니다.",
  "Budget Cap": "예산 상한",
  "Limit how much this rule can spend in one application.":
    "이 규칙이 한 번 적용될 때 쓸 수 있는 예산을 제한합니다.",
  "Max Budget": "최대 예산",
  "Maximum budget allowed for this rule application.":
    "이 규칙 적용에 허용되는 최대 예산입니다.",
  "Max Recipients": "최대 수혜자 수",
  "Cap how many agents can receive the effect each time.":
    "매번 효과를 받을 수 있는 에이전트 수를 제한합니다.",
  Count: "개수",
  "Maximum recipient count.": "최대 수혜자 수입니다.",
  "Weight Multiplier": "가중치 배수",
  "Scale the rule priority score before ranking recipients.":
    "수혜자 순위를 매기기 전에 규칙 우선순위 점수에 배수를 적용합니다.",
  Value: "값",
  "Multiplier value applied to the score.": "점수에 적용되는 배수 값입니다.",
  "Priority Score Weights": "우선순위 점수 가중치",
  "Blend talent, wealth, and bankruptcy history into a ranking score.":
    "재능, 자산, 파산 이력을 조합해 순위 점수를 만듭니다.",
  "Talent Weight": "재능 가중치",
  "Weight applied to talent.": "재능에 적용되는 가중치입니다.",
  "Wealth Weight": "자산 가중치",
  "Weight applied to wealth.": "자산에 적용되는 가중치입니다.",
  "Bankrupt Weight": "파산 가중치",
  "Weight applied to bankruptcy history.": "파산 이력에 적용되는 가중치입니다.",
  "Agent Count": "에이전트 수",
  "Total number of agents in the simulation.": "시뮬레이션의 총 에이전트 수입니다.",
  "Initial Wealth": "초기 자산",
  "Starting wealth for every agent before simulation begins.":
    "시뮬레이션 시작 전 각 에이전트의 시작 자산입니다.",
  "Wealth Floor": "자산 하한",
  "Minimum possible wealth after loss events.": "손실 이벤트 후 가능한 최소 자산입니다.",
  "Agent Radius": "에이전트 반지름",
  "Visual and collision radius for agents.": "에이전트의 시각 및 충돌 반지름입니다.",
  "Arena Width": "공간 너비",
  "Width of the simulation arena.": "시뮬레이션 공간의 너비입니다.",
  "Arena Height": "공간 높이",
  "Height of the simulation arena.": "시뮬레이션 공간의 높이입니다.",
  "Agent Speed": "에이전트 속도",
  "Base movement speed for agents.": "에이전트의 기본 이동 속도입니다.",
  "Event Speed": "이벤트 속도",
  "Base movement speed for luck and bad luck nodes.":
    "행운/불운 노드의 기본 이동 속도입니다.",
  "Event Drift": "이벤트 이동",
  "How much luck and bad luck dots move. Baseline keeps them fixed.":
    "행운/불운 점이 얼마나 움직이는지 정합니다. 기본모델에서는 고정됩니다.",
  "Speed Profile": "속도 프로필",
  "Preset profile for interpreting the speed values.":
    "속도 값을 해석하는 프리셋 프로필입니다.",
  Slow: "느림",
  Normal: "보통",
  Fast: "빠름",
  "Green Dot Share": "초록점 비율",
  "Event Grid Rings": "이벤트 그리드 링",
  "Adds or removes the event cluster one outer grid ring at a time.":
    "이벤트 묶음을 바깥 그리드 링 단위로 한 바퀴씩 늘리거나 줄입니다.",
  "Share of the current event grid that is green. The ring setting changes total dots, while this controls the color split.":
    "현재 이벤트 그리드 중 초록점 비율입니다. 링 설정이 전체 점 수를 바꾸고, 이 값은 색상 비율만 조정합니다.",
  rings: "링",
  "Luck Nodes": "행운 노드",
  "Number of positive event nodes.": "긍정 이벤트 노드 수입니다.",
  "Bad Luck Nodes": "불운 노드",
  "Number of negative event nodes.": "부정 이벤트 노드 수입니다.",
  "Lucky Gain Base": "행운 이득 기본값",
  "Base wealth gain from positive collisions.": "긍정 충돌로 얻는 기본 자산 증가량입니다.",
  "Unlucky Loss Base": "불운 손실 기본값",
  "Base wealth loss from negative collisions.": "부정 충돌로 인한 기본 자산 감소량입니다.",
  "Year Interval": "연간 간격",
  "Number of steps that represent a yearly capital return cycle.":
    "연간 자본 수익 주기를 나타내는 스텝 수입니다.",
  "Capital Return": "자본 수익률",
  "Base capital growth rate.": "기본 자본 성장률입니다.",
  "Talent Return Bonus": "재능 수익 보너스",
  "Additional growth multiplier contributed by talent.":
    "재능이 기여하는 추가 성장 배수입니다.",
  "Comfortable Wealth": "안정 자산 기준",
  "Wealth level where security contribution saturates.":
    "안정감 기여도가 포화되는 자산 수준입니다.",
  "Trend Clamp": "추세 제한값",
  "Clamp value used for recent wealth delta normalization.":
    "최근 자산 변화량 정규화에 쓰는 제한값입니다.",
  "Bankruptcy Penalty": "파산 패널티",
  "Penalty applied to happiness when wealth hits the floor.":
    "자산이 바닥에 도달했을 때 행복도에 적용되는 패널티입니다.",
  agents: "명",
  currency: "단위",
  steps: "단계",
  ratio: "비율",
  units: "단위",
};

export function translateUi(locale: Language, text: string): string {
  if (locale === "en") {
    return text;
  }

  return koTranslations[text] ?? text;
}

export function getLocaleTag(locale: Language): string {
  return locale === "ko" ? "ko-KR" : "en-US";
}

export function translateStatus(
  locale: Language,
  status: SimulationStatus,
): string {
  return translateUi(locale, status);
}

export function translateMetricLabel(
  locale: Language,
  key: ComparisonCard["key"],
): string {
  switch (key) {
    case "averageWealth":
      return translateUi(locale, "Average wealth");
    case "meanHappiness":
      return translateUi(locale, "Mean happiness");
    case "giniCoefficient":
      return translateUi(locale, "Gini");
    case "povertyRate":
      return translateUi(locale, "Poverty Rate");
    case "top10WealthShare":
      return locale === "ko" ? "상위 10% 점유율" : "Top 10% Share";
    case "policyCost":
      return translateUi(locale, "Policy Cost");
    default:
      return key;
  }
}

export function localizeConfigFieldDefinition(
  definition: ConfigFieldDefinition,
  locale: Language,
): ConfigFieldDefinition {
  if (locale === "en") {
    return definition;
  }

  if (definition.valueType === "select") {
    return {
      ...definition,
      label: translateUi(locale, definition.label),
      description: translateUi(locale, definition.description),
      unit: definition.unit ? translateUi(locale, definition.unit) : definition.unit,
      options: definition.options.map((option) => ({
        ...option,
        label: translateUi(locale, option.label),
      })),
    };
  }

  return {
    ...definition,
    label: translateUi(locale, definition.label),
    description: translateUi(locale, definition.description),
    unit: definition.unit ? translateUi(locale, definition.unit) : definition.unit,
  };
}

export function localizePolicyTypeDefinition(
  definition: PolicyTypeDefinition,
  locale: Language,
): PolicyTypeDefinition {
  if (locale === "en") {
    return definition;
  }

  return {
    ...definition,
    label: translateUi(locale, definition.label),
    description: translateUi(locale, definition.description),
    parameters: definition.parameters.map((parameter) => ({
      ...parameter,
      label: translateUi(locale, parameter.label),
      description: translateUi(locale, parameter.description),
      options: parameter.options?.map((option) => ({
        ...option,
        label: translateUi(locale, option.label),
      })),
    })),
  };
}

export function localizePolicyPreset(
  preset: PolicyPreset,
  locale: Language,
): PolicyPreset {
  if (locale === "en") {
    return preset;
  }

  return {
    ...preset,
    name: translateUi(locale, preset.name),
    description: translateUi(locale, preset.description),
  };
}

export function localizeComposerBlockDefinition(
  definition: ComposerBlockDefinition,
  locale: Language,
): ComposerBlockDefinition {
  if (locale === "en") {
    return definition;
  }

  return {
    ...definition,
    label: translateUi(locale, definition.label),
    description: translateUi(locale, definition.description),
    parameters: definition.parameters.map((parameter) => ({
      ...parameter,
      label: translateUi(locale, parameter.label),
      description: translateUi(locale, parameter.description),
      options: parameter.options?.map((option) => ({
        ...option,
        label: translateUi(locale, option.label),
      })),
    })),
  };
}

export function translateCategory(
  locale: Language,
  category: "target" | "condition" | "effect" | "modifier",
): string {
  switch (category) {
    case "target":
      return locale === "ko" ? "대상" : "Target";
    case "condition":
      return locale === "ko" ? "조건" : "Condition";
    case "effect":
      return locale === "ko" ? "효과" : "Effect";
    case "modifier":
      return locale === "ko" ? "보정" : "Modifier";
  }
}

export function summarizeComposerBlock(
  locale: Language,
  block: ComposerBlock,
): string {
  switch (block.type) {
    case "allAgents":
      return translateUi(locale, "Whole population");
    case "bottomWealthPercent":
    case "topWealthPercent":
      return locale === "ko"
        ? `${(block.payload as { percent: number }).percent}% 구간`
        : `${(block.payload as { percent: number }).percent}% slice`;
    case "wealthBelow":
    case "wealthAbove":
    case "talentAbove":
    case "talentBelow":
      return locale === "ko"
        ? `기준값 ${(block.payload as { threshold: number }).threshold}`
        : `Threshold ${(block.payload as { threshold: number }).threshold}`;
    case "highTalentLowWealth":
      return locale === "ko"
        ? `재능 ${(block.payload as { talentThreshold: number }).talentThreshold}+ / 자산 <= ${(block.payload as { wealthCeiling: number }).wealthCeiling}`
        : `Talent ${(block.payload as { talentThreshold: number }).talentThreshold}+ / Wealth <= ${(block.payload as { wealthCeiling: number }).wealthCeiling}`;
    case "bankruptAgents":
    case "bankruptCountAtLeast":
      return locale === "ko"
        ? `${(block.payload as { minBankruptCount: number }).minBankruptCount}회 이상`
        : `At least ${(block.payload as { minBankruptCount: number }).minBankruptCount}`;
    case "rescuedCountBelow":
      return locale === "ko"
        ? `${(block.payload as { maxRescuedCount: number }).maxRescuedCount} 미만`
        : `Below ${(block.payload as { maxRescuedCount: number }).maxRescuedCount}`;
    case "grantAmount":
      return locale === "ko"
        ? `금액 ${(block.payload as { amount: number }).amount}`
        : `Amount ${(block.payload as { amount: number }).amount}`;
    case "wealthTax":
      return `>${(block.payload as { threshold: number }).threshold} ${locale === "ko" ? "에 " : " at "}${Math.round((block.payload as { rate: number }).rate * 100)}%`;
    case "progressiveTax":
      return locale === "ko"
        ? `${(block.payload as { brackets: Array<unknown> }).brackets.length}개 구간`
        : `${(block.payload as { brackets: Array<unknown> }).brackets.length} brackets`;
    case "setWealthFloor":
      return locale === "ko"
        ? `하한 ${(block.payload as { minimumWealth: number }).minimumWealth}`
        : `Floor ${(block.payload as { minimumWealth: number }).minimumWealth}`;
    case "bailout":
      return locale === "ko"
        ? `${(block.payload as { amount: number }).amount}, 최대 ${(block.payload as { maxPerAgent: number }).maxPerAgent}회`
        : `${(block.payload as { amount: number }).amount} up to ${(block.payload as { maxPerAgent: number }).maxPerAgent}x`;
    case "talentGrant":
      return locale === "ko"
        ? `재능 ${(block.payload as { talentThreshold: number }).talentThreshold}+ 대상 ${(block.payload as { amount: number }).amount}`
        : `${(block.payload as { amount: number }).amount} for talent ${(block.payload as { talentThreshold: number }).talentThreshold}+`;
    case "budgetCap":
      return locale === "ko"
        ? `상한 ${(block.payload as { maxBudget: number }).maxBudget}`
        : `Cap ${(block.payload as { maxBudget: number }).maxBudget}`;
    case "maxRecipients":
      return locale === "ko"
        ? `최대 ${(block.payload as { count: number }).count}`
        : `Max ${(block.payload as { count: number }).count}`;
    case "weightMultiplier":
      return `x${(block.payload as { value: number }).value}`;
    case "priorityScoreWeight": {
      const payload = block.payload as {
        talentWeight: number;
        wealthWeight: number;
        bankruptWeight: number;
      };
      return `T ${payload.talentWeight} / W ${payload.wealthWeight} / B ${payload.bankruptWeight}`;
    }
  }
}
