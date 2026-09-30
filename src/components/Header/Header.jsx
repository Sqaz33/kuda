import "../../styles/header.css"

function Header({
  cityName, // если нет
  selecting, // если идет голосование
  currentPlaceNumber, // если идет голосование
  totalPlaces, // если идет голосование
  remainingSeconds, // если идет голосование
  day, // если нет
  time,// если нет
  showTopBrand, 
  roomCode, // если идет голосование
  bottomRight} // можно всегда
) {
  function getDay() {
    return day === "tomorrow" ? "завтра" : "сегодня";
  }

  function renderTopLeft() {
    if (selecting) {
      return <span className="header__room-name">{`КОМНАТА #${roomCode}`}</span>
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
    if (selecting) {
      const cur = String(currentPlaceNumber).padStart(2, '0')
      const total = String(totalPlaces).padStart(2, '0')
      return (
        <div className="header__selecting-running">
          <span className="header__selecting-running__timer">
            {secondsToMMSS()} ДО КОНЦА
          </span>
          <span className="header__selecting-running__progress">
            МЕСТО {cur} / {total}
          </span>
        </div>
      )
    } else {
      return (
        <span className="header__time"> 
          {getDay().toUpperCase()} · {time}
        </span>
      )
    }
  }

  function renderTopRight() {
    if (showTopBrand) {
      return <div className="header__brand">КУДА.</div>
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
          <span className="header__logo">куда.</span>
          <span className="header__slogan">Выбираем место вместе</span>
        </div>
        {bottomRight}
      </div>
    </header>
  )
}

export default Header
