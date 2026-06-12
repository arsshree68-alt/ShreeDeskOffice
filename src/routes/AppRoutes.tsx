import { Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import DashboardPage from '../pages/dashboard/Dashboard'
import PdfPage from '../pages/pdf/PdfPage'
import ExcelPage from '../pages/excel/ExcelPage'
import WordPage from '../pages/word/WordPage'
import PptPage from '../pages/ppt/PptPage'
import ImagePage from '../pages/image/ImagePage'
import DataPage from '../pages/data/DataPage'
import StatsPage from '../pages/stats/StatsPage'
import GovtPage from '../pages/govt/GovtPage'

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<MainLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="pdf" element={<PdfPage />} />
      <Route path="excel" element={<ExcelPage />} />
      <Route path="word" element={<WordPage />} />
      <Route path="ppt" element={<PptPage />} />
      <Route path="image" element={<ImagePage />} />
      <Route path="data" element={<DataPage />} />
      <Route path="stats" element={<StatsPage />} />
      <Route path="govt" element={<GovtPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
)

export default AppRoutes
