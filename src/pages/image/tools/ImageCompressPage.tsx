import ToolPageShell from '../../../components/ui/ToolPageShell'
import ImageToolWorkspace from '../../../components/image/ImageToolWorkspace'
import type { ImageToolDefinition } from '../../../components/image/ImageToolWorkspace'
import { FiMinimize } from 'react-icons/fi'

const tool: ImageToolDefinition = {
  id: 'compress',
  title: 'Compress Image',
  description: 'Reduce image file size while preserving visual quality. Ideal for web and email attachments.',
  icon: <FiMinimize />,
  acceptsMultiple: true,
}

const ImageCompressPage = () => (
  <ToolPageShell
    title="Compress Image"
    description="Reduce file size while preserving quality. Supports JPEG, PNG, and WEBP. Runs entirely in your browser — no upload to servers."
    suiteLabel="Image Suite"
    suiteRoute="/image"
    icon="🗜️"
  >
    <ImageToolWorkspace key="compress" tool={tool} />
  </ToolPageShell>
)

export default ImageCompressPage
