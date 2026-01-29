import { useState } from 'react'
import './App.css'
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom'
import LandingPage from './pages/landing.jsx'
import Authentication from './pages/Authentication.jsx'
import { AuthProvider } from './contexts/AuthContexts.jsx'
import VideoMeet from './pages/videomeet.jsx'



function App() {
  return (
    <>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />}  />
            <Route path="/auth" element={<Authentication />} />
            <Route path='/:url' element={<VideoMeet />} />

            <Route path="*" element={<h1>404 Not Found</h1>} />
          </Routes>
        </AuthProvider>
      </Router>
    </>
  )
}

export default App
