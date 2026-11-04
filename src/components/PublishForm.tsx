import { useState } from 'react'
import type { FormEvent } from 'react'
import { accountErrorMessage, publishTemplate } from '../lib/accountApi'
import type { TemplateItem } from '../lib/accountApi'

interface Props {
  template: TemplateItem
  onDone: (message: string) => Promise<void>
  onError: (message: string) => void
}

export default function PublishForm({ template: t, onDone, onError }: Props) {
  const [author, setAuthor] = useState(t.author_name)
  const [desc, setDesc] = useState(t.description)
  const [allowCopy, setAllowCopy] = useState(t.allow_copy)
  const [busy, setBusy] = useState(false)
  const idp = `pub-${t.id}`

  const run = async (pub: boolean) => {
    setBusy(true)
    try {
      await publishTemplate(t.id, pub, author, desc, allowCopy)
      await onDone(
        pub ? 'Trasa jest widoczna w bibliotece.' : 'Trasa została wycofana z biblioteki.'
      )
    } catch (e) {
      console.error(e)
      onError(accountErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void run(true)
  }

  if (t.hidden) {
    return (
      <div className="publish-form">
        <p role="status" className="bad">
          Ta trasa została ukryta po zgłoszeniach innych użytkowników i nie jest widoczna w
          bibliotece. Nie można jej opublikować ponownie. Skontaktuj się z administratorem
          serwisu.
        </p>
        {t.is_public && (
          <button type="button" disabled={busy} onClick={() => void run(false)}>
            Wycofaj z biblioteki
          </button>
        )}
      </div>
    )
  }

  return (
    <form className="publish-form" onSubmit={submit}>
      <label htmlFor={`${idp}-author`} className="field-label">
        Nazwa autora (widoczna w bibliotece)
      </label>
      <input
        id={`${idp}-author`}
        className="answer"
        maxLength={40}
        placeholder="np. Anna K., SP 5 Kalisz"
        autoComplete="off"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
      />

      <label htmlFor={`${idp}-desc`} className="field-label">
        Krótki opis (opcjonalnie, do 300 znaków)
      </label>
      <textarea
        id={`${idp}-desc`}
        rows={3}
        maxLength={300}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />

      <label>
        <input
          type="checkbox"
          checked={allowCopy}
          onChange={(e) => setAllowCopy(e.target.checked)}
        />
        <span>
          Pozwól innym kopiować trasę do swoich tras (kopia zawiera poprawne odpowiedzi)
        </span>
      </label>

      <p className="note">
        Publikując, zgadzasz się, aby inni nauczyciele uruchamiali tę trasę z własnymi klasami
        (a przy zaznaczonej opcji powyżej także ją kopiowali i zmieniali). Nie umieszczaj w trasie
        danych osobowych uczniów ani cudzych materiałów chronionych prawem autorskim. Zmiany trasy
        widoczne są w bibliotece od razu po zapisaniu.
      </p>

      <div className="row">
        <button type="submit" disabled={busy || !author.trim()}>
          {t.is_public ? 'Zapisz zmiany publikacji' : 'Opublikuj w bibliotece'}
        </button>
        {t.is_public && (
          <button type="button" disabled={busy} onClick={() => void run(false)}>
            Wycofaj z biblioteki
          </button>
        )}
      </div>
    </form>
  )
}