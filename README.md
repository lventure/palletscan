# Palletscan

Minimale scan-webapp voor het magazijn. Elke scan wordt één nieuwe rij in het tabblad **Scans** van de Google Sheet. Geen stockbeheer, geen login, geen dashboard.

Scanflow: pallet-SSCC scannen, daarna de locatiebarcode scannen (of F1 = Uitgenomen, F2 = Verzonden, F3 = Klaar, Esc = annuleren). De rij wordt eerst op het toestel bewaard en daarna verzonden. Lukt verzenden niet, dan blijft de app het opnieuw proberen.

## Bestanden

| Bestand | Waarvoor | Waar komt het |
|---|---|---|
| `index.html` | De app. Het configuratieblok staat bovenaan. | GitHub Pages |
| `scanlogic.js` | Ontleden en valideren van SSCC en locatie, en de flowregels. | GitHub Pages |
| `sw.js` | Bewaart de app op het toestel, zodat ze ook zonder wifi start. | GitHub Pages |
| `manifest.webmanifest`, `icon-192.png`, `icon-512.png` | Nodig om de app op het startscherm te zetten. | GitHub Pages |
| `apps-script/Code.gs` | Schrijft de rijen in de Sheet. | In de Sheet (Apps Script) |
| `tests/` | Geautomatiseerde tests. | Optioneel op GitHub Pages |
| `testbarcodes.html` | Afdrukbare barcodes voor de magazijntest. | Afdrukken |
| `TESTLIJST.md` | Testlijst om in het magazijn af te lopen. | Afdrukken |

De spec vroeg één HTML-bestand. Het zijn er drie geworden (`index.html`, `scanlogic.js`, `sw.js`) plus manifest en iconen. Reden: zonder `sw.js` start de app niet als er geen wifi is, en `scanlogic.js` staat apart zodat de tests exact de code testen die op het toestel draait. Er is nog altijd geen framework en geen buildstap.

## Installeren

### Stap 1: het Apps Script in de Sheet

1. Open de Sheet en kies **Extensies > Apps Script**.
2. Verwijder de voorbeeldcode en plak de volledige inhoud van `apps-script/Code.gs`.
3. Vervang bovenaan `SHARED_KEY` door een eigen sleutel. Neem minstens 16 tekens. Wil je hem op de Zebra kunnen typen, neem dan bijvoorbeeld 20 willekeurige cijfers. Je kunt hem ook als barcode afdrukken en op het toestel inscannen.
4. Klik op **Opslaan**. Kies bovenaan de functie `eersteKeerInstellen` en klik op **Uitvoeren**. Google vraagt toestemming: kies je account, klik op **Geavanceerd** en ga verder. Het script vraagt alleen toegang tot deze ene Sheet.
5. Controleer in de Sheet dat het tabblad **Scans** bestaat met een kopregel.
6. Klik op **Implementeren > Nieuwe implementatie** (Deploy > New deployment). Kies als type **Web-app**, met:
   - Uitvoeren als: **Ik**
   - Wie heeft toegang: **Iedereen**
7. Klik op **Implementeren** en kopieer de **URL van de web-app**. Die eindigt op `/exec`.
8. Open die URL in een browser. Je moet zien: `Palletscan: het script is actief.`

Staat **Iedereen** er niet bij, maar alleen "Iedereen binnen (domein)", dan blokkeert de Workspace-beheerder anonieme toegang. De app kan dan niet schrijven, want de toestellen melden zich niet aan bij Google. Laat de beheerder dit toestaan, of zet het script in een Sheet van een account waar het wel kan.

Pas je `Code.gs` later aan, kies dan **Implementeren > Implementaties beheren > potlood > Versie: Nieuwe versie > Implementeren**. Zo blijft de URL dezelfde. Een "Nieuwe implementatie" geeft een nieuwe URL, en dan moet je `index.html` ook aanpassen.

### Stap 2: het adres in de app zetten

Open `index.html` in een teksteditor. Plak in het configuratieblok bovenaan de URL uit stap 1 bij `ENDPOINT_URL`.

Laat `SHARED_KEY` leeg. Een gratis GitHub Pages-site vereist een publieke repo, en alles wat in `index.html` staat is dan voor iedereen leesbaar. De sleutel vul je in stap 4 per toestel in; hij staat dan alleen op het toestel.

Zet om dezelfde reden `Code.gs` met je echte sleutel niet in de repo.

### Stap 3: publiceren op GitHub Pages

1. Maak een account op github.com en maak een nieuwe repository, bijvoorbeeld `palletscan`, met zichtbaarheid **Public**.
2. Kies **uploading an existing file** en sleep deze bestanden erin: `index.html`, `scanlogic.js`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`. De map `tests` en `testbarcodes.html` mogen erbij.
3. Klik op **Commit changes**.
4. Ga naar **Settings > Pages**. Kies bij Source **Deploy from a branch**, branch **main**, map **/ (root)**, en klik op **Save**.
5. Na ongeveer een minuut staat de app op `https://<gebruikersnaam>.github.io/palletscan/`.

Elke andere https-hosting werkt ook: zet dezelfde bestanden samen in één map.

### Stap 4: elk toestel instellen

1. Open de URL uit stap 3 in Chrome.
2. Tik op het tandwiel (⚙) rechtsonder.
3. Vul de **toestelnaam** in (bijvoorbeeld `HEFTRUCK1`) en de **sleutel** uit stap 1.
4. Tik op **Test verbinding**. Je moet "Verbinding in orde" zien. Deze test schrijft niets in de Sheet.
5. Tik op **Sluiten**.

Dit werkt op dezelfde manier op een pc of smartphone. Zie "Testen zonder Zebra" hieronder.

### Stap 5: op het startscherm zetten

1. Open de app in Chrome op het toestel, met wifi.
2. Tik op **⋮** rechtsboven en kies **Toevoegen aan startscherm** (of **App installeren**) en bevestig.
3. Start de app voortaan via het pictogram **Palletscan**. Ze opent dan zonder adresbalk.
4. Controle: zet het toestel in vliegtuigmodus en start de app. Ze moet gewoon openen.

De app wordt pas bij het eerste bezoek op het toestel bewaard. Open ze dus minstens één keer met wifi.

## Testen zonder Zebra (smartphone of pc)

Doe dit vóór de aankoop. Je hebt alleen stap 1 tot 3 van "Installeren" nodig.

Neem bij voorkeur een Android-smartphone met Chrome: dat is dezelfde browser als op de Zebra. Een iPhone of een pc werkt ook, maar zegt minder over hoe de Zebra zich zal gedragen.

### Basistest: typen in plaats van scannen

1. Open de URL van de app in Chrome op de smartphone.
2. Tik op ⚙. Vul een toestelnaam in (bijvoorbeeld `TEST-GSM`) en de sleutel. Tik op **Test verbinding**: je moet "Verbinding in orde" zien. Tik op **Sluiten**.
3. Tik op **⌨** naast het invoerveld. De knop wordt geel. Tik op het invoerveld als het schermtoetsenbord niet vanzelf verschijnt.
4. Typ `340123451234567895` en druk op Enter. Het scherm wordt geel en toont het nummer. Dit is Pallet A van `testbarcodes.html`.
5. Typ `A03` en druk op Enter. Het scherm wordt groen. Controleer in de Sheet dat er een rij bij is met de juiste datum, SSCC en plaats.
6. Typ `354123450000000014` en Enter, en tik op de knop **Uitgenomen**. Doe hetzelfde met **Verzonden**, **Klaar** en **Annuleer**. Bij Annuleer mag er geen rij bijkomen.
7. Typ `340123451234567890` en Enter. Het scherm wordt rood met "controlecijfer fout".
8. Typ `A03` en Enter zonder open pallet. Het scherm wordt rood met "Eerst pallet scannen".
9. Zet de smartphone in vliegtuigmodus en doe twee volledige scans. **WACHTRIJ 2** is oranje. Sluit Chrome volledig en open de app opnieuw: de wachtrij staat nog op 2. Zet vliegtuigmodus uit: binnen een halve minuut staat de wachtrij op 0 en staan beide rijen één keer in de Sheet.
10. Zet de app op het startscherm (stap 5 hierboven) en start ze in vliegtuigmodus.
11. Loop met de smartphone naar de plek in het magazijn met de zwakste wifi en doe daar een paar scans.

Uit `TESTLIJST.md` kun je zo de stappen 1 tot 15, 17, 18 en 21 tot 26 aflopen. Gebruik de knoppen op het scherm waar de lijst F1, F2, F3 of Esc zegt.

Verwijder na de test de testrijen uit het tabblad Scans.

### Echt scannen zonder Zebra

Typen test de app, maar niet het scannen. Dat kan op drie manieren, van meest naar minst gelijkend op de Zebra:

- **Een USB- of Bluetooth-handscanner** aan een pc of smartphone. Zo'n scanner werkt als toetsenbord, net als de Zebra: hij typt de barcode en drukt op Enter. Ligt er ergens in het bedrijf één, gebruik die. Stuurt hij geen Enter mee, stel dan in de handleiding van de scanner het achtervoegsel "Enter" of "CR" in. Scan hiermee de afgedrukte `testbarcodes.html` en een echt palletlabel.
- **Een toetsenbord-app met camerascanner** op een Android-smartphone. Zoek in Google Play op "barcode scanner keyboard"; voorbeelden zijn "Barcode Keyboard: Scan & Type" en "Barcode & QR code Keyboard". Zo'n app typt de gescande barcode in het invoerveld. Zet in die app "Enter na scan" aan, of tik zelf op Enter. Kies dat toetsenbord in Android en tik in Palletscan op **⌨**. Deze apps zijn niet getest met Palletscan.
- **Een Bluetooth-toetsenbord** gekoppeld aan een Android-smartphone. Daarmee test je F1, F2, F3 en Esc: open ⚙ en kijk bij **Toetstest** wat elke toets doorstuurt, en probeer ze daarna in de scanflow. Dit toont hoe Chrome op Android met die toetsen omgaat. De Zebra kan er nog van afwijken.

### Wat deze test wel en niet zegt

| Getest met smartphone of pc | Alleen te testen met de Zebra zelf |
|---|---|
| Het Apps Script schrijft juist in de Sheet | Komen F1, F2, F3 en Esc door in Chrome op dit toestel |
| De scanflow en alle foutmeldingen | DataWedge levert de tekens juist en in volgorde aan |
| De wachtrij bij wifi-uitval en na een herstart | Leesafstand vanop de heftruck |
| Starten zonder wifi vanaf het startscherm | Lezen door wikkelfolie |
| Een eerste beeld van de wifi-dekking | Leesbaarheid van het scherm en bediening met handschoenen |

De rechterkolom bevat de risico's van de aankoop zelf. Vraag de leverancier daarom een demotoestel of een retourrecht, en loop daarmee de stappen 16, 20 en 27 tot 30 van `TESTLIJST.md` af vóór de aankoop definitief is.

## Scannerinstellingen op de Zebra (DataWedge)

De scanner moet de gelezen tekst als toetsaanslagen doorgeven, gevolgd door Enter. De namen hieronder kunnen per DataWedge-versie licht verschillen.

1. Open de app **DataWedge**. Kies **⋮ > New profile** en noem het `Palletscan`.
2. **Associated apps**: voeg `com.android.chrome` toe met activity `*`.
3. **Barcode input**: Enabled.
   - **Decoders**: Code 128 aan. GS1-128 (het palletlabel) valt onder Code 128. Zet decoders uit die je niet nodig hebt, zoals EAN-13, EAN-8 en UPC. Dan kan de scanner minder verkeerde barcodes lezen.
   - **Scan params > Code ID type**: None. Staat dit op AIM, dan werkt de app ook: ze verwijdert `]C1` zelf.
4. **Keystroke output**: Enabled.
   - **Basic data formatting**: Enabled, **Send data** aan, **Send ENTER key** aan, prefix en suffix leeg, Send TAB key uit.
   - **Key event options > Send Characters as Events**: aan. Standaard stuurt DataWedge de tekens als één tekst en alleen Enter als toets; dan kan Enter vóór de tekst aankomen. Met deze optie aan komt alles in de juiste volgorde.
   - **Send Enter as string**: uit.
5. **Intent output** en **IP output**: Disabled.

Werkt scannen wel in Chrome maar niet in de app op het startscherm, zet dan dezelfde instellingen ook in **Profile0 (default)**.

Problemen oplossen:

| Wat je ziet | Wat je doet |
|---|---|
| Tekens vallen weg of staan door elkaar | Verhoog **Inter-character delay** in Keystroke output. |
| De tekst verschijnt in het invoerveld maar er gebeurt niets | **Send ENTER key** staat uit. |
| Foutmelding met een halve code | **Send Characters as Events** aanzetten, of **Key event delay** op 50 tot 100 ms. |
| Er verschijnt niets op het scherm | Het profiel is niet gekoppeld aan Chrome, of Keystroke output staat uit. |

Andere instellingen op het toestel:

- **Datum en tijd**: automatisch via het netwerk. Het tijdstip in kolom A komt van de klok van het toestel.
- **Schermtime-out**: lang genoeg, zodat het scherm niet uitvalt tussen twee scans.
- **Chrome**: wis nooit de browsegegevens zolang de wachtrij niet op 0 staat. De wachtrij staat in de opslag van Chrome (IndexedDB).

## Functietoetsen

De toetsen staan in het configuratieblok: `KEYS_UITGENOMEN`, `KEYS_VERZONDEN`, `KEYS_KLAAR`, `KEYS_ANNULEREN`. Standaard zijn dat F1, F2, F3 en Escape.

Wat een toets op het toestel echt doorstuurt, zie je in **⚙ > Toetstest**: druk op de toets en lees de waarde achter `key` of `code`. Zet die waarde in het configuratieblok.

Op Android kan Esc door het systeem als "Terug" behandeld worden. Dan sluit de app in plaats van te annuleren. Test dat als eerste, en kies zo nodig een andere toets voor annuleren.

Komt een toets helemaal niet door in Chrome, of doet ze iets anders, dan zijn er drie uitwegen:

1. Een andere toets kiezen die wel doorkomt en die in het configuratieblok zetten.
2. De toets op de Zebra omleiden via **Instellingen > Key Programmer**.
3. De commando-barcodes `CMDUIT`, `CMDVERZ`, `CMDKLAAR` en `CMDESC` afdrukken (ze staan op `testbarcodes.html`) en op de heftruck kleven. Die werken zoals F1, F2, F3 en Esc en vragen geen toets.

De knoppen op het scherm werken altijd.

## Rek-etiketten

Een palletplaats is één letter en twee cijfers: `A03`, `B48`, `C13`, `D94`. De barcode op het rek bevat alleen die palletplaats, zonder iets ervoor of erna: `A04` voor plaats A04.

- **Type:** Code 128. Dat type heeft een verplicht controleteken, waardoor een halve of foute lezing wordt weggegooid. Gebruik geen Code 39 of Interleaved 2 of 5: zonder controlecijfer geven die bij korte codes af en toe een foute lezing, en bij drie tekens is elke foute lezing een andere geldige plaats.
- **Streepbreedte:** minstens 1 mm voor het smalste streepje. De barcode is dan ongeveer 7 cm breed, of 9 cm met de witte rand links en rechts erbij.
- **Witte rand:** laat links en rechts minstens 1 cm wit.
- **Hoogte:** minstens 3 cm, zodat richten vanop de heftruck makkelijk is.
- **Leesbare tekst:** druk de plaats ook groot in gewone tekst op het etiket.
- **Materiaal:** mat, niet glanzend. Glans geeft schittering in de scanner.

Test de leesafstand met een paar etiketten vóór je alle rekken labelt.

Een locatie met de hand typen vraagt een letter. Op een Zebra met numeriek toetsenbord (29 of 38 toetsen) typ je letters meestal via een alfa-toets; op het alfanumerieke toetsenbord (47 toetsen) rechtstreeks. Typen is alleen de reserve voor een onleesbaar etiket, maar hou er rekening mee bij de keuze van het toetsenbord.

## De Sheet

| Kolom | Inhoud |
|---|---|
| A | Datum en uur van de scan op het toestel, als echte datum-tijdwaarde in Belgische tijd |
| B | Pallet-SSCC, 18 cijfers, als tekst |
| C | Palletplaats (bijvoorbeeld `A03`), of `Uitgenomen`, `Verzonden` of `Klaar`, als tekst |
| D | ScanID, alleen om dubbele rijen te vermijden |
| E | Toestelnaam |
| F | Tijdstip waarop Google de rij ontving |

Een groot verschil tussen A en F betekent dat de scan lang in de wachtrij zat, of dat de klok van het toestel fout staat. Kolom E zegt welk toestel het was.

Afspraken voor het tabblad Scans:

- Zet er zelf geen formules of extra kolommen in. Het script schrijft onder de laatste gevulde rij; een formule die naar beneden doorloopt verschuift die plek. Verwijs vanuit een ander tabblad naar `Scans`.
- Sorteer het tabblad niet. Gebruik een filterweergave of een ander tabblad.
- Een fout herstel je met een nieuwe scan. De laatste rij van een SSCC is de geldige.
- In de nacht van zomer- naar wintertijd komt het uur tussen 02:00 en 03:00 twee keer voor. Kolom A toont de kloktijd, dus scans uit die twee uren zijn daar niet te onderscheiden. De rijvolgorde blijft juist.

## Aannames

1. **Locatieformaat** is één letter gevolgd door twee cijfers (`A03`, `B48`, `C13`, `D94`). Alle letters van A tot Z zijn toegelaten, en kleine letters worden hoofdletters. Bestaan alleen de rijen A tot D, zet `LOCATION_PATTERN` dan op `^[A-D][0-9]{2}$`: een typfout in de letter wordt dan geweigerd.
2. **Geen prefix:** de barcode op het rek bevat alleen de palletplaats (`A04`). De app herkent een locatie alleen aan het patroon.
3. **Elke invoer die exact op het patroon past, is een locatie**, gescand of getypt (`A03` + Enter). Met een SSCC kan dat niet botsen: die bestaat alleen uit cijfers, en een palletplaats begint met een letter. Een andere barcode in het magazijn die toevallig uit één letter en twee cijfers bestaat, wordt wel als locatie aanvaard. Hou het patroon daarom zo smal mogelijk.
4. **Tijdstip** in kolom A is het moment waarop de rij compleet wordt: de locatiescan of de druk op F1, F2 of F3. Niet het moment van de palletscan.
5. **SSCC**: aanvaard worden 18 cijfers, `00` + 18 cijfers en `(00)` + 18 cijfers, met of zonder `]C1` of een andere AIM-identifier ervoor. 18 cijfers die zelf met `00` beginnen blijven 18 cijfers. Spaties worden genegeerd, zodat je het nummer kunt overtypen zoals het onder de barcode staat.
6. **Dezelfde SSCC twee keer na elkaar** scannen is geen fout: de pallet blijft open. Alleen een andere SSCC wordt geblokkeerd.
7. **Dubbele lezing van een rek-etiket** binnen 1,5 seconde na het wegschrijven wordt genegeerd. Zonder die regel geeft elke dubbele lezing een rode fout vlak na een groene bevestiging.
8. **Open pallet** wordt niet bewaard bij een herlaadde pagina. Er is dan nog niets geschreven; scan de pallet opnieuw.
9. **Esc** zonder open pallet doet niets, behalve een foutmelding wegnemen.
10. **Kolommen E en F** zijn toegevoegd aan de spec, zoals afgesproken.
11. **Dubbele rijen**: het script vergelijkt de ScanID met de laatste 5000 rijen. Een herhaalde verzending van een scan die meer dan 5000 rijen geleden al geschreven werd, zou dubbel komen. Dat vraagt een toestel dat dagenlang offline was én een verloren antwoord.
12. **Toegang**: de web-app staat op "Iedereen" en is beveiligd met de gedeelde sleutel. De sleutel houdt toevallige bezoekers en bots tegen. Wie de sleutel kent kan rijen toevoegen, maar niets lezen, wijzigen of verwijderen.
13. **Het script is gekoppeld aan de Sheet** (aangemaakt via Extensies > Apps Script), niet een los script. Het heeft daardoor alleen toegang tot deze ene Sheet.
14. **Verzenden gebeurt alleen terwijl de app open staat.** Een gesloten app verzendt niets; de wachtrij blijft staan tot de app weer opent.
15. **Commando-barcodes** zijn toegevoegd als reserve voor de functietoetsen. Ze stonden niet in de spec.
16. **Toegelaten tekens in kolom C**: het script aanvaardt alleen letters, cijfers, spatie, punt, streepjes en schuine streep, en het eerste teken moet een letter of cijfer zijn. Zo kan er nooit een formule in de Sheet komen. Kies je later een locatieformaat met andere tekens, pas dan `LOC_ALLOWED` in `Code.gs` mee aan. Anders worden die scans geweigerd.
17. **Een tweede druk op F1, F2 of F3** binnen 1,5 seconde na het wegschrijven wordt genegeerd, net als een dubbele lezing van een rek-etiket.
18. **Klaar** werkt zoals Uitgenomen en Verzonden: pallet scannen, F3 drukken, en kolom C krijgt de tekst `Klaar`. De toets, de tekst en de commando-barcode zijn instelbaar (`KEYS_KLAAR`, `TEXT_KLAAR`, `BARCODE_KLAAR`).

## Betrouwbaarheid: wat de app wel en niet opvangt

Wel opgevangen:

- Geen of zwakke wifi: scans blijven in de wachtrij op het toestel en gaan in volgorde weg zodra het kan. Wachttijd tussen pogingen: 2 seconden, oplopend tot 30.
- Pagina herladen, Chrome of toestel herstart: de wachtrij blijft staan.
- Het toestel valt uit vlak na een scan: de groene bevestiging komt pas nadat de scan op schijf staat, niet eerder.
- De app staat twee keer open op hetzelfde toestel (een tabblad in Chrome en de app op het startscherm): beide delen dezelfde wachtrij, zonder elkaars scans te overschrijven.
- Verzending gelukt maar antwoord verloren: de scan wordt opnieuw verstuurd, en het script herkent de ScanID en schrijft geen tweede rij.
- Meerdere toestellen tegelijk: het script laat één schrijver tegelijk toe.
- Verkeerde sleutel of fout adres: de scans blijven in de wachtrij en de oranje statusregel zegt wat er mis is.
- App starten zonder wifi: werkt, na één eerste bezoek met wifi.

Niet opgevangen:

- Browsegegevens van Chrome wissen, of Chrome verwijderen, terwijl er scans in de wachtrij staan. Die scans zijn dan weg.
- Een toestel dat stukgaat of verloren raakt met scans in de wachtrij.
- Een foute klok op het toestel. Kolom F maakt dat zichtbaar, maar corrigeert het niet.

Onder **⚙ > Nog niet verzonden of geweigerd** staan alle scans die nog op het toestel staan, als tekst die je kunt kopiëren. Dat is de noodoplossing als verzenden blijvend mislukt.

Een scan die het script weigert (bijvoorbeeld door een verouderde versie van de app) blokkeert de wachtrij niet. Hij blijft op het toestel staan, onderaan verschijnt **✖ 1 geweigerd**, en in ⚙ staat de reden. Met **Geweigerde scans opnieuw proberen** zet je ze terug in de wachtrij, bijvoorbeeld nadat je `Code.gs` hebt aangepast.

Het getal naast **WACHTRIJ** bovenaan is het aantal scans dat nog niet in de Sheet staat. Groen is 0, oranje is meer dan 0.

## De app aanpassen

1. Pas `index.html` aan en verhoog `APP_VERSION` in het configuratieblok.
2. Upload het bestand opnieuw naar GitHub (**Add file > Upload files**).
3. Op elk toestel: open de app met wifi, wacht tien seconden, sluit ze en open ze opnieuw. De nieuwe versie is actief vanaf de tweede start. Het versienummer staat linksonder.

Het toestel haalt bij elke start met wifi alle bestanden van de app samen op en vervangt de oude alleen als ze allemaal binnen zijn. Een toestel draait dus nooit een half bijgewerkte app.

## Wijzigingen

### Versie 1.2.0

- De prefix `LOC` is verdwenen. De barcode op het rek bevat alleen de palletplaats (`A04`). Een barcode met `LOC` ervoor wordt nu geweigerd als onbekende barcode.
- De instellingen `LOCATION_PREFIX` en `ALLOW_TYPED_LOCATION_WITHOUT_PREFIX` bestaan niet meer.

Bijwerken vanaf 1.1.0: upload `index.html` en `scanlogic.js` opnieuw naar GitHub, altijd samen. `tests/cases.js` en `testbarcodes.html` zijn ook gewijzigd, als je die gepubliceerd hebt. `Code.gs` is niet gewijzigd. Open daarna de app op elk toestel twee keer met wifi; linksonder moet `v1.2.0` staan. Druk `testbarcodes.html` opnieuw af.

### Versie 1.1.0

- Locatieformaat is nu één letter en twee cijfers (`A03`), in plaats van `X.XX`.
- Nieuwe status **Klaar** met sneltoets F3, een knop op het scherm en de commando-barcode `CMDKLAAR`. De vier knoppen staan op een smal scherm in twee rijen.

Bijwerken vanaf 1.0.0: upload `index.html` en `scanlogic.js` opnieuw naar GitHub, altijd samen. `tests/cases.js` en `testbarcodes.html` zijn ook gewijzigd, als je die gepubliceerd hebt. `Code.gs` is niet gewijzigd: het Apps Script hoef je niet opnieuw te implementeren. Open daarna de app op elk toestel twee keer met wifi; linksonder moet `v1.1.0` staan.

Rijen die al met het oude formaat (`3.12`) geschreven zijn, blijven staan zoals ze zijn.

## Tests

Met Node.js:

```
node tests/run.js              # SSCC, locatie en flowregels (50 tests)
node tests/run-appsscript.js   # Code.gs tegen een nagebootste Sheet (13 tests)
```

Zonder Node.js: upload de map `tests` mee en open `https://<gebruikersnaam>.github.io/palletscan/tests/`. Die pagina draait de 50 tests van `run.js` in de browser.

## Wat getest is en wat niet

Getest in een geautomatiseerde browser (Chromium, schermgrootte van de MC3400): de volledige scanflow, alle foutgevallen, F1, F2, F3 en Esc, de knoppen op het scherm, de wachtrij bij uitval, herladen, een verloren antwoord, een fout adres, een verkeerde sleutel, een geweigerde scan, starten zonder netwerk, een update van de app, en twee toestellen die tegelijk schrijven. Het script `Code.gs` is daarbij getest tegen een nagebootste Sheet.

Twee belastingstests, omdat "een scan mag nooit verloren gaan" de harde eis is:

- De browser hard afbreken 0,01 tot 2 seconden na de groene bevestiging, 8 keer: de scan stond na de herstart telkens nog in de wachtrij. Dit is een afgebroken proces, geen echte stroomuitval.
- De app twee keer open op hetzelfde toestel, 3600 scans terwijl het andere venster voortdurend verzendt, deels met 35 % verloren antwoorden: 3600 rijen, geen verlies, geen dubbels, volgorde bewaard.

Niet getest, omdat het alleen ter plaatse kan:

- `Code.gs` in een echte Google Sheet. De nagebootste Sheet volgt het gedrag van Google, maar is Google niet.
- De Zebra MC3400 zelf: of F1, F2, F3 en Esc doorkomen in Chrome, hoe DataWedge de tekens aanlevert, en of het scherm leesbaar is vanop armlengte.
- Het lezen van echte palletlabels door wikkelfolie.

Daarvoor dient `TESTLIJST.md`.
