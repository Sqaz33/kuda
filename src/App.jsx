import { Routes, Route, Navigate } from 'react-router'
import AppLayout from './layouts/AppLayout'
import HomePage from './pages/HomePage'
import JoinByCodePage from './pages/JoinByCodePage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/join-by-code" element={<JoinByCodePage />} />
        <Route path="*" element={<Navigate to="/" replace />} /> {/*todo: 404*/}
      </Route>
    </Routes>
  )
}

export default App
