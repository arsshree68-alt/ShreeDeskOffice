import ToolPageShell from '../../../components/ui/ToolPageShell'
import ImageToolWorkspace from '../../../components/image/ImageToolWorkspace'
import type { ImageToolDefinition } from '../../../components/image/ImageToolWorkspace'
import { FiCrop } from 'react-icons/fi'

const tool: ImageToolDefinition = {
  id: 'resize',
  title: 'Resize & Crop',
  description: 'Adjust image dimensions and crop to specific aspect ratios. Supports aspect-ratio lock.',
  icon: <FiCrop />,
  acceptsMultiple: false,
}

const ImageResizePage = () => (
  <ToolPageShell
    title="Resize & Crop"
    description="Adjust image width, height, and aspect ratio. Lock dimensions to maintain proportions. All processing happens locally."
    suiteLabel="Image Suite"
    suiteRoute="/image"
    icon="✂️"
  >
    <ImageToolWorkspace key="resize" tool={tool} />
  </ToolPageShell>
)

export default ImageResizePage
