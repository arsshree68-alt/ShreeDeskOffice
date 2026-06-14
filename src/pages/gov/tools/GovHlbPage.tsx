import ToolPageShell from '../../../components/ui/ToolPageShell'
import HlbConsolidatorTool from '../../../tools/gov/HlbConsolidatorTool'

const GovHlbPage = () => (
  <ToolPageShell
    title="HLB Consolidator"
    description="Consolidate health block / local block data from multiple spreadsheets into a single district-level report. Runs entirely in your browser — no data leaves your device."
    suiteLabel="Government Suite"
    suiteRoute="/govt"
    icon="🏥"
  >
    <HlbConsolidatorTool />
  </ToolPageShell>
)

export default GovHlbPage
