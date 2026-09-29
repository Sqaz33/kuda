import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import { BrowserRouter, Router, Route } from 'react-router'
import Header from './components/Header/Header'

function App() {

  function getTime() { 
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`
  }

  return (
    // <BrowserRouter>
    //   <Router>
    //     <Route>

    //     </Route>
    //   </Router>
    // </BrowserRouter>
    <main>
      <Header
        cityName="Волгоград"
        day="tomorrow"
        time={getTime()}
        showTopBrand
        bottomRight={(<span>right</span>)}
      />
      <section>
        <h1>testststs</h1>
        <span>asdfasdfadsf</span>
      </section>
    </main>
  )

}

export default App
