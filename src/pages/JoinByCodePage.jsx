import { Link } from "react-router"
import "../styles/join_by_code.css"
import { useState } from "react"

function JoinByCodePage() {
  const [code, setCode] = useState("")
  
  function handleCodeChange(event) {
    const nextCode = event.target.value
    if (/^\d{0,4}$/.test(nextCode)) {
      setCode(nextCode)
    }
  } 

  return (
    <div className="join-by-code">
      <Link to="/" className="join-by-code__back">
        ←  НА ГЛАВНУЮ
      </Link>
      
      <div className="join-by-code__step">
        01 / ПРИСОЕДИНИТЬСЯ
      </div>
      
      <h1 className="join-by-code__title">
        Введите код<br></br>комнаты.
      </h1>
      
      <p className="join-by-code__description">
        Попросите четырёхзначный код у создателя комнаты.
      </p>

      <form className="join-by-code__form">
        <label join-by-code__form__label>
          КОД КОМНАТЫ 
        </label>
        <div className="join-by-code__form-code">
          <input 
            className="join-by-code__form-input" 
            type="text"
            value={code}
            onChange={handleCodeChange}
            maxLength={4}
          />

          <div className="join-by-code__form-code-solts">
            {[0, 1, 2, 3].map(idx => 
              <div
                key={idx}
                className="join-by-code__form-code-slot"
              >
                {code[idx] && ""}
              </div>
            )}
          </div>
        </div>

        <p className="join-by-code__form-hint">
          Нажмите на поле и введите четыре цифры.
        </p>
      </form>

      <div className="join-by-code__next">
        <div className="join-by-code__next-label">
          ЧТО БУДЕТ ДАЛЬШЕ
        </div>

        <p className="join-by-code__next-text">
          Покажем условия встречи и участников. Вы подтвердите вход в комнату.
        </p>
      </div>

      <button className="join-by-code__submit">
        НАЙТИ КОМНАТУ
      </button>

      <div className="join-by-code__footer-hint">
        ЕСТЬ ССЫЛКА? ОТКРОЙТЕ ЕЁ ИЗ СООБЩЕНИЯ
      </div>
    </div>
  )
}

export default JoinByCodePage