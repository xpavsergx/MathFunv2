# **Dokumentacja techniczna "MathFun"**

**Twórcy:** Serhii Pavlovskyi, Viyaleta Maruk, Denys Prokopenko 

MathFun to interaktywna aplikacja mobilna dedykowana uczniom szkół podstawowych. Jej głównym celem jest wsparcie nauki matematyki poprzez dynamiczne lekcje teorii, moduły treningowe (Trener), testy oraz gry edukacyjne. Aplikacja łączy edukację z elementami grywalizacji, oferując system punktów XP oraz osiągnięć.

**Architektura i stack technologiczny:**

1. Frontend:
    * Framework: React Native z wykorzystaniem Expo
    * Środowisko deweloperskie: Expo Go oraz Expo Developer Server, co pozwala na błyskawiczne testowanie zmian na urządzeniach fizycznych w czasie rzeczywistym
    * Język: TypeScript – wykorzystany w całym projekcie dla zapewnienia bezpieczeństwa typów i uniknięcia błędów w obliczeniach matematycznych

2. Backend i infrastruktura (Firebase):

   Projekt w pełni wykorzystuje ekosystem Firebase:
    * Cloud Firestore: NoSQL-owa baza danych przechowująca dynamiczną teorię, dane oraz statystyki użytkowników
    * Firebase Authentication: Obsługa bezpiecznego logowania i rejestracji uczniów
    * Cloud Functions: Logika serwerowa (katalog /functions) do zadań wymagających bezpiecznego środowiska poza telefonem użytkownika
    * Hosting/Config: Pliki konfiguracyjne firebase.json oraz google-services.json integrujące aplikację z chmurą Google

**Interfejs użytkownika i nawigacja**

Widoki aplikacji są pogrupowane w folderze src/:
* Zarządzanie użytkownikiem: 
   * src/screens/LoginScreen.tsx, RegisterScreen.tsx oraz UserDetailsScreen.tsx (do edycji danych profilowych)
* Wybór treści: 
   * src/screens/TopicListScreen.tsx, TheoryScreen.tsx, TheorySubTopicListScreen.tsx oraz SubTopicListScreen.tsx – nawigacja po konkretnych działach matematyki
* Moduły edukacyjne: 
   * src/screens/MathSprintScreen.tsx, MatchstickEquationGame.tsx – gry edukacyjne
   * src/screens/screens_4_klassa/screens_4K1R/DivisionWithRemainderScreen4.tsx - interaktywne trynery
   * src/Components/RachunkiMemoryBlock.tsx - dynamiczna teoria
   * src/assets/avatar - wszystkie obrazy 
   * src/data/questionsDb.json - baza danych dla testów, pojedynków
* Wyniki:
   * src/screens/ResultsScreen.tsx – podsumowanie sesji nauki, wyświetlanie zdobytych punktów XP
   * src/screens/TrainerStatsScreen.tsx - statystyka trenerów pobierana z bazy firebase

**Nawigacja i przepływ:**

Plik App.tsx stanowi rdzeń logiczny aplikacji, odpowiadając za inicjalizację usług, sprawdzanie stanu zalogowania oraz definicję hierarchii widoków.

Struktura stosów nawigacyjnych:

* HomeStack (HomeStackNavigator): Największy moduł zawierający ekrany wyboru klas, działy tematyczne oraz dziesiątki dedykowanych Trenerów (np. WrittenAdditionTrainer, DecimalAdditionTrainer, FractionsTrainer).
* GamesStack (GamesStackNavigator): Obsługuje moduły rozrywkowe takie jak MathSprint, MatchstickGame czy NumberMemoryGame.
* ProfileStack (ProfileStackNavigator): Zarządza widokiem profilu, edycją danych użytkownika (UserDetails), statystykami trenera oraz sklepem (Store).
* FriendsStack: Obsługa listy znajomych oraz ustawień pojedynków (DuelSetup).
* ActivityStack: Wyświetlanie powiadomień i historii aktywności.

Wykorzystanie Bottom Tab Navigator:

Główna nawigacja opiera się na dolnym pasku zadań (Tab.Navigator), który integruje powyższe stosy. Został on spersonalizowany pod kątem wizualnym:
* Dynamiczne kolory: Obsługa motywu jasnego i ciemnego (useColorScheme)
* Ikony: Wykorzystanie biblioteki @expo/vector-icons/Ionicons
* Platform Specific UI: Dostosowanie wysokości paska dla systemu Android

**Serwisy:**

Folder services zawiera moduły odpowiedzialne za logikę aplikacji oraz komunikację z bazą danych Firebase. Dzięki wydzieleniu tej logiki z komponentów wizualnych, kod jest łatwiejszy w utrzymaniu.

* System grywalizacji i postępów
   * xpService.ts: Zarządza punktami doświadczenia. Oblicza punkty za każdą poprawną odpowiedź w trenerach (np. MultiplicationTrainer) i przesyła je do Firestore. Odpowiada również za logikę awansowania na kolejne poziomy
   * achievementService.ts: Monitoruje aktywność użytkownika i sprawdza, czy spełniono warunki do odblokowania odznaki (np. rozwiązanie 10 zadań bez błędu). Zarządza kolekcją osiągnięć w profilu gracza
   * userStatsService.ts: Agreguje dane o wynikach z różnych działów matematyki. To dzięki niemu na ekranie StatsScreen uczeń widzi wykresy swojej skuteczności
* System zadań i powiadomień
   * dailyQuestService.ts: Generuje i weryfikuje codzienne wyzwania, które motywują do regularnego powrotu do aplikacji
   * notificationService.ts: Obsługuje komunikaty systemowe oraz powiadomienia o nowych osiągnięciach lub zaproszeniach do pojedynków od znajomych
   * friendService.ts: Zarządza relacjami między użytkownikami, umożliwiając wyszukiwanie znajomych i organizowanie pojedynków matematycznych widocznych w DuelSetupScreen
* Narzędzia pomocnicze (/src/utils)
   * matchstickEngine.ts: Zawiera matematyczną logikę gry w zapałki. Przelicza on układ patyczków na cyfry i znaki operacji, sprawdzając, czy po przesunięciu zapałki równanie stało się poprawne 

**Model danych i baza Firestore**

Aplikacja wykorzystuje bazę NoSQL Cloud Firestore zlokalizowaną w regionie eur3. Dane są zorganizowane w trzech głównych kolekcjach, co pozwala na dynamiczne zarządzanie treścią bez konieczności aktualizacji aplikacji w sklepie.

Kolekcja users:
* Przechowuje profile użytkowników, ich postępy oraz stan grywalizacji. Każdy dokument posiada unikalne ID użytkownika z Firebase Auth
* Profil podstawowy: firstName, email, userClass (klasa, do której uczęszcza uczeń), avatar
* System XP: xp (całkowite punkty), xpToday (punkty z bieżącego dnia), level, xpToNextLevel
* Statystyki globalne: stats (liczba poprawnych odpowiedzi, ukończone testy)
* Grywalizacja: coins (waluta wewnątrz aplikacji), earnedAchievementsMap (lista odblokowanych osiągnięć), dailyQuests (postęp zadań dziennych)
* Relacje: friends (tablica zawierająca identyfikatory innych użytkowników)

Kolekcja lessons (Dynamiczna Teoria):

To serce systemu edukacyjnego. Zamiast sztywno zakodowanych tekstów, ekrany takie jak RachunkiMemoryBlock.tsx  pobierają dane z tej kolekcji
* Dokumenty: 
   * Odpowiadają konkretnym tematom (np. fractionsExpansion, decimalAddition, clockReading)
* Pola:
   * title: Nazwa lekcji wyświetlana użytkownikowi
   * steps: Tablica ciągów tekstowych, które użytkownik odkrywa po kliknięciu przycisku "Dalej ➜". Dzięki temu trudne zagadnienia są dawkowane porcjami

Kolekcja duels (Pojedynki):

Zarządza pojedynkiem w czasie rzeczywistym.

* Status: Przechowuje informacje o challengerId (kto zaprosił) oraz players (lista uczestników)
* Pytania: questionIds – zestaw wylosowanych zadań dla obu graczy
* Wyniki: Mapa results zawierająca score i time dla każdego gracza, co pozwala wyłonić zwycięzcę po ukończeniu gry przez obie osoby

**Zarządzanie stanem lokalnym (Context API):**

Aplikacja wykorzystuje React Context (plik src/context/AuthContext.tsx) do globalnego zarządzania sesją użytkownika
* Umożliwia to dostęp do danych o zalogowanym użytkowniku (ID, statystyki) w dowolnym komponencie bez konieczności przekazywania danych przez "props"
* Zapewnia automatyczne przekierowanie na ekran logowania, jeśli sesja wygaśnie

**Konfiguracja Środowiska (Setup)**

Aby uruchomić projekt deweloperski, należy wykonać następujące kroki:

* Instalacja zależności: npm install
* Uruchomienie serwera Expo: npx expo start
* Testowanie: Użycie aplikacji Expo Go na urządzeniu fizycznym lub emulatorze

**Budowanie i Dystrybucja (Build)**

Projekt został skonfigurowany pod kątem tworzenia natywnych plików instalacyjnych dla systemu Android
* Format pliku: Wygenerowano plik binarny w formacie APK (Android Package Kit)
* Narzędzie budowania: Do kompilacji kodu wykorzystano EAS Build
* Konfiguracja: Proces ten opiera się na pliku eas.json (widocznym w strukturze projektu), który definiuje profile budowania (np. development, preview, production)
* Instalacja: Dzięki wygenerowaniu pliku APK, aplikacja może być instalowana bezpośrednio na urządzeniach z systemem Android bez konieczności korzystania z narzędzia Expo Go