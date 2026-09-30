import { Routes, Route, Navigate } from 'react-router'
import AppLayout from './layouts/AppLayout'
import HomePage from './pages/HomePage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} /> {/*todo: 404*/}
      </Route>
    </Routes>
  )
}

export default App
