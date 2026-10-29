import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/layout/RequireAuth'
import LoginPage from '@/pages/Auth/LoginPage'
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import MaterialsPage from '@/pages/Materials/MaterialsPage'
import MaterialDetailPage from '@/pages/Materials/MaterialDetailPage'
import FlashcardsPage from '@/pages/Flashcards/FlashcardsPage'
import QuizListPage from '@/pages/Quiz/QuizListPage'
import QuizSessionPage from '@/pages/Quiz/QuizSessionPage'
import TutorPage from '@/pages/Tutor/TutorPage'
import RunnerPage from '@/pages/Runner/RunnerPage'
import SettingsPage from '@/pages/Settings/SettingsPage'
import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route path="masuk" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="materi" element={<MaterialsPage />} />
          <Route path="materi/:id" element={<MaterialDetailPage />} />
          <Route path="flashcard" element={<FlashcardsPage />} />
          <Route path="quiz" element={<QuizListPage />} />
          <Route path="quiz/:quizId" element={<QuizSessionPage />} />
          <Route path="tutor" element={<TutorPage />} />
          <Route path="runner" element={<RunnerPage />} />
          <Route path="pengaturan" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
