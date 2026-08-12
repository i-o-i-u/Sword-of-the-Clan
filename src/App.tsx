import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import Login from './pages/Login'
import Home from './pages/Home'

export default function App() {
  return (
    <>
      <AuthLoading>
        <div className="center-screen">
          <p>...جاري التحميل</p>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <Login />
      </Unauthenticated>

      <Authenticated>
        <Home />
      </Authenticated>
    </>
  )
}
