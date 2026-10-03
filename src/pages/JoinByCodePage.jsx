import { Link } from "react-router"
import "../styles/join_by_code.css"
import { useState } from "react"

function JoinByCodePage() {
  const [code, setCode] = useState("")
  const [cursorPosition, setCursorPosition] = useState(null)
  
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

      <form 
        className="join-by-code__form" 
        onSubmit={(event) => { event.preventDefault() }}
      >
        <label 
          className="join-by-code__form__label"
          htmlFor="join-by-code__form-input"
        >
          КОД КОМНАТЫ 
        </label>
        <div className="join-by-code__form-code">
          <input 
            id="join-by-code__form-input" 
            className="join-by-code__form-input" 
            inputMode="numeric"
            type="text"
            value={code}
            onChange={handleCodeChange}
            maxLength={4}
            onClick={(event) => {
              const end = event.currentTarget.value.length
              event.currentTarget.setSelectionRange(end, end)
            }}
            onSelect={(event) => {
              setCursorPosition( 
                event.currentTarget.selectionStart
              )
            }}
            onBlur={() => setCursorPosition(null)}
          />

          <div className="join-by-code__form-code-slots">
            {[0, 1, 2, 3].map(idx => 
              { 
                const digit = code[idx]
                const className = idx === cursorPosition 
                  ? "join-by-code__form-code-slot is-select" 
                  : "join-by-code__form-code-slot"
                return digit 
                ? (<div
                      key={idx}
                      className={className}
                    >
                      {digit}
                    </div>)
                : (<div
                    key={idx}
                    aria-hidden="true"
                    className={`${className} is-empty`}
                  />)
              }
            )}
          </div>
        </div>

        <p className="join-by-code__form-hint">
          Нажмите на поле и введите четыре цифры.
        </p>

        <div className="join-by-code__next">
          <div className="join-by-code__next-label">
            ЧТО БУДЕТ ДАЛЬШЕ
          </div>

          <p className="join-by-code__next-text">
            Покажем условия встречи и участников. Вы подтвердите вход в комнату.
          </p>
        </div>

        <button 
          className="join-by-code__submit"
          type="submit"
        >
          НАЙТИ КОМНАТУ
        </button>
      </form>

      <div className="join-by-code__footer-hint">
        ЕСТЬ ССЫЛКА? ОТКРОЙТЕ ЕЁ ИЗ СООБЩЕНИЯ
      </div>
    </div>
  )
}

export default JoinByCodePage