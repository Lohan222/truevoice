import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class DevErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('DevErrorBoundary caught render error:', error, errorInfo)
  }

  render() {
    if (this.state.error && import.meta.env.DEV) {
      return (
        <div style={{ padding: '16px', fontFamily: 'sans-serif', background: '#fff', color: '#111' }}>
          <h1 style={{ fontSize: '18px', marginBottom: '8px' }}>Render Error</h1>
          <p style={{ margin: 0 }}>{this.state.error.message || String(this.state.error)}</p>
        </div>
      )
    }

    return this.props.children
  }
}

const appTree = (
  <React.StrictMode>
    {import.meta.env.DEV ? (
      <DevErrorBoundary>
        <App />
      </DevErrorBoundary>
    ) : (
      <App />
    )}
  </React.StrictMode>
)

ReactDOM.createRoot(document.getElementById('root')).render(appTree)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error)
      })
      return
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
      console.log('Development mode: service workers unregistered')
    } catch (error) {
      console.error('Development service worker cleanup failed:', error)
    }
  })
}
