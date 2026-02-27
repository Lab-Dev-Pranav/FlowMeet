import './App.css'
import { Route, Routes, HashRouter as Router } from 'react-router-dom'
import LandingPage from './pages/landing.jsx'
import Authentication from './pages/Authentication.jsx'
import { AuthProvider } from './contexts/AuthContexts.jsx'
import VideoMeet from './pages/videomeet.jsx'
import Navbar from './components/nav.jsx'
import Home from './pages/Home.jsx'
import History from './pages/history.jsx'


function App() {
  return (
    

    <Router>
        
      <AuthProvider>
      <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Authentication />} />
          <Route path="/home" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/:url" element={<VideoMeet />} />
          <Route path="*" element={<h1>404 Not Found</h1>} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
