const CONTROLLER =
  '[Antoni Markowski]'
const CONTACT = '[antekman2@gmail.com]'
const REGION = '[West EU (Ireland)]'

const incomplete = [CONTROLLER, CONTACT, REGION].some((s) => s.startsWith('[UZUPEŁNIJ'))

export default function PrivacyPage() {
  return (
    <main className="teacher privacy">
      <h1>Prywatność</h1>

      {incomplete && (
        <p role="alert" className="bad">
          Dokument jest niekompletny: uzupełnij dane administratora w pliku
          src/pages/PrivacyPage.tsx przed udostępnieniem aplikacji innym osobom.
        </p>
      )}

      <p className="lead">
        Questownik to gra terenowa dla uczniów. Zbieramy jak najmniej danych, a uczniowie grają bez
        zakładania konta.
      </p>

      <section aria-labelledby="p-admin">
        <h2 id="p-admin">Kto odpowiada za dane</h2>
        <p>Administrator: {CONTROLLER}</p>
        <p>Kontakt w sprawach danych: {CONTACT}</p>
      </section>

      <section aria-labelledby="p-players">
        <h2 id="p-players">Uczniowie (gracze)</h2>
        <ul>
          <li>
            <strong>Nie wymagamy konta, adresu e-mail, imienia ani nazwiska.</strong> Drużyna
            wpisuje dowolną nazwę. Prosimy, aby nie używać w niej imion i nazwisk.
          </li>
          <li>
            Zapisujemy nazwę drużyny, wynik, czas, liczbę prób i postęp w grze oraz techniczny,
            anonimowy identyfikator sesji.
          </li>
          <li>
            <strong>Lokalizacja GPS</strong> jest używana wyłącznie w przeglądarce, do obliczenia
            odległości od punktu. Nie wysyłamy jej na serwer i nie zapisujemy.
          </li>
          <li>
            <strong>Zdjęcia</strong> (zadania ze zdjęciem) są zmniejszane, a ich metadane, w tym
            lokalizacja, usuwane. Widzi je tylko prowadzący grę, który może je usunąć w dowolnym
            momencie. Zdjęcia znikają też po usunięciu gry. Prosimy, aby nie fotografować osób.
          </li>
          <li>
            W pamięci przeglądarki zapisujemy identyfikator sesji, nazwę drużyny i kopię trasy
            (aby gra działała po odświeżeniu strony i przy słabym zasięgu). Nie używamy plików
            cookie reklamowych ani narzędzi analitycznych.
          </li>
          <li>
            Aparat jest używany tylko do skanowania kodów QR oraz do zdjęć w zadaniach ze
            zdjęciem. Obraz z aparatu przy skanowaniu kodów nie jest nigdzie zapisywany ani
            wysyłany.
          </li>
        </ul>
      </section>

      <section aria-labelledby="p-teachers">
        <h2 id="p-teachers">Nauczyciele i autorzy tras</h2>
        <ul>
          <li>
            Konto wymaga adresu e-mail (logowanie e-mailem lub przez Google). Przechowujemy adres,
            Twoje trasy i uruchomione gry.
          </li>
          <li>
            Publikując trasę w bibliotece, udostępniasz publicznie jej treść, opis oraz wpisaną
            przez siebie nazwę autora. Nie pokazujemy adresu e-mail.
          </li>
          <li>
            Zgłoszenia tras zapisujemy razem z powodem i identyfikatorem konta zgłaszającego, na
            potrzeby moderacji.
          </li>
          <li>
            <strong>Konto możesz usunąć sam</strong> w zakładce „Moje konto”. Usuwa to Twoje trasy,
            gry (wraz z wynikami i zdjęciami) i samo konto.
          </li>
        </ul>
      </section>

      <section aria-labelledby="p-vendors">
        <h2 id="p-vendors">Usługi, z których korzystamy</h2>
        <ul>
          <li>Supabase: baza danych i logowanie (region: {REGION}).</li>
          <li>Vercel: hosting aplikacji (może zapisywać standardowe logi techniczne).</li>
          <li>Google: opcjonalne logowanie kontem Google (tylko dla nauczycieli).</li>
          <li>
            OpenStreetMap: kafelki mapy. Przeglądarka łączy się bezpośrednio z serwerami
            OpenStreetMap, które widzą adres IP użytkownika.
          </li>
        </ul>
      </section>

      <section aria-labelledby="p-retention">
        <h2 id="p-retention">Jak długo przechowujemy dane</h2>
        <p>
          Dane gier (wyniki, zdjęcia) przechowujemy do czasu ich usunięcia przez prowadzącego grę
          albo usunięcia jego konta. Zalecamy usuwanie gier i zdjęć po zakończeniu zajęć.
        </p>
      </section>

      <section aria-labelledby="p-rights">
        <h2 id="p-rights">Twoje prawa</h2>
        <p>
          Możesz żądać dostępu do danych, ich sprostowania, usunięcia lub ograniczenia
          przetwarzania. Napisz na adres kontaktowy powyżej. Masz też prawo wnieść skargę do
          Prezesa Urzędu Ochrony Danych Osobowych.
        </p>
      </section>

      <p className="note">
        Dokument informacyjny. Przed użyciem aplikacji w szkole ustal z dyrekcją lub inspektorem
        ochrony danych, kto jest administratorem i czy potrzebne są dodatkowe zgody (np. na
        zdjęcia).
      </p>
    </main>
  )
}