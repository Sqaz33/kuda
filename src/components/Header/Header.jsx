import "../../styles/header.css"

function Header({
  cityName, 
  isSelecting, 
  currentPlaceNumber,
  totalPlaces,
  remainingSeconds,
  day,
  time,
  showTopBrand, 
  roomCode,
  bottomRight}
) {
  function getDay() {
    return day === "tomorrow" ? "завтра" : "сегодня";
  }

  function renderTopLeft() {
    if (isSelecting) {
      return <span className="header__room-name">{`комната#${roomCode}`}</span>
    } else {
      return <span className="header__city-name">{cityName.toUpperCase()}</span>
    }
  }

  function secondsToMMSS() {
    return [
        Math.floor(remainingSeconds / 60), 
        remainingSeconds % 60]
      .map(v => String(v).padStart(2, '0'))
      .join(':')
  }

  function renderTopCenter() {
    if (isSelecting) {
      const cur = String(currentPlaceNumber).padStart(2, '0')
      const total = String(totalPlaces).padStart(2, '0')
      return (
        <div className="header__selecting-running">
          <span>{secondsToMMSS()} ДО КОНЦА</span>
          <span>место {cur} / {total}</span>
        </div>
      )
    } else {
      return (
        <div className="header__time">
          <span>{getDay()}</span>
          <span>·</span>
          <span>{time}</span>
        </div>)
    }
  }

  function renderTopRight() {
    if (showTopBrand) {
      return <div className="header__brand">куда.</div>
    } else {
      return <div className="header__room-code">КОД: {roomCode}</div>
    }
  }
  // todo brand-slogan home link
  return (
    <header className="header">
      <div className="header__top">
        <div className="header__top__left">
          {renderTopLeft()}
        </div>
        {renderTopCenter()}
        <div className="header__top__right">
          {renderTopRight()}
        </div>
      </div>
      <div className="header__bottom">
        <div className="header__logo-slogan"> 
          <span>куда.</span>
          <span>Выбираем место вместе</span>
        </div>
        {bottomRight}
      </div>
    </header>
  )
}

export default Header
