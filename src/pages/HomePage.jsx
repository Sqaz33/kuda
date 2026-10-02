import "../styles/home_page.css"
import placeImage from "../assets/hero.png"
import { Link } from "react-router"

function HomePage() {
  return (
    <div className="home-page">
      <div className="home-hero">
        <span className="home-hero__text">
          ВЕЧЕР НАЧИНАЕТСЯ
        </span>
        <img 
          className="home-hero__image"
          src={placeImage}
          alt=""
        />
      </div>
      <section className="home-intro">
        <p className="home-intro__label">
          01 / групповой выбор
        </p>
        <h1 className="home-intro__title">
          Место, которое<br></br>выберут все.
        </h1>
        <p className="home-intro__description">
          Укажите планы, позовите друзей и вместе выберите заведение для вечера
        </p>
      </section>
      <ol className="home-steps">
        <li className="home-steps__step">
          <span className="home-steps__step-number">01</span>
          <span className="home-steps__step-content">
            СОЗДАТЬ КОМНАТУ
          </span>
        </li>
        <li className="home-steps__step">
          <span className="home-steps__step-number">02</span>
          <span className="home-steps__step-content">
            СОБРАТЬ ГОЛОСА
          </span>
        </li>
        <li className="home-steps__step">
          <span className="home-steps__step-number">03</span>
          <span className="home-steps__step-content">
            ДОГОВОРИТЬСЯ О МЕСТЕ
          </span>
        </li>
      </ol>
      <nav className="home-actions">
        <Link 
          className="home-actions__create-room" 
          to="/create-room"
        >
          СОЗДАТЬ КОМНАТУ
        </Link>
        <Link 
          className="home-actions__join-by-code" 
          to="/join-by-code"
        >
          ВОЙТИ ПО КОДУ
        </Link>
      </nav>
      <span className="home-follow-link-offer">
        ЕСТЬ ССЫЛКА? ОТКРОЙТЕ ЕЁ ИЗ СООБЩЕНИЯ
      </span>
    </div>
  )
}

export default HomePage