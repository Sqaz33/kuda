import { Outlet } from "react-router";
import Header from "../components/Header/Header";
import "../styles/app_layout.css"
import { useEffect, useState } from "react";

function AppLayout() {
  const [time, setTime] = useState(120)

  useEffect(() => { // todo delete
    const id = setTimeout(() => setTime(t => Math.max(t - 1, 0)), 1000)
    return () => clearTimeout(id)
  }, [time])

  function getTime() { 
    const now = new Date()  
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`
  }

  return (
    <div className="app-layout">
      <Header
        cityName="Волгоград"
        day="today"
        time={getTime()}
        showTopBrand
      />
      {/* <Header
        selecting
        currentPlaceNumber={7}
        totalPlaces={12}
        remainingSeconds={time}
        roomCode={7001}
        bottomRight={(<span>right</span>)}
      /> */}
      <main>
        <Outlet />
      </main>
    </div>
  )
}


export default AppLayout