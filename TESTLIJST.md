# Testlijst magazijn

Nodig: de Zebra met de app op het startscherm, de afgedrukte `testbarcodes.html`, de Sheet open op een pc of smartphone, en één echt palletlabel.

Nog geen Zebra? Met een smartphone of pc kun je de stappen 1 tot 15, 17, 18 en 21 tot 26 al aflopen. Zie "Testen zonder Zebra" in de README. Gebruik dan de knoppen op het scherm waar hier F1 tot F4 of Esc staat.

De testpallets A en B zijn verzonnen nummers. De rijen die je ermee schrijft, mag je na de test zelf uit het tabblad Scans verwijderen.

## A. Basisflow

- [ ] 1. Start: het scherm is zwart met **SCAN PALLET**, en **WACHTRIJ 0** is groen.
- [ ] 2. Scan **Pallet A**. Het scherm wordt geel en toont de 18 cijfers groot. Je hoort een korte tik.
- [ ] 3. Scan **Locatie A03**. Het scherm wordt groen met **A03** en je hoort één hoge toon. Daarna staat er opnieuw SCAN PALLET.
- [ ] 4. In de Sheet staat een nieuwe rij: datum en uur kloppen, de SSCC heeft 18 cijfers, plaats is `A03`, en de toestelnaam klopt.
- [ ] 5. Scan **Pallet A**, druk **F1**. Groen met **Uitgenomen**. De rij staat in de Sheet.
- [ ] 6. Scan **Pallet B**, druk **F2**. Groen met **Verzonden**. Scan **Pallet B** opnieuw, druk **F3**: groen met **Gang**. Scan **Pallet B** nog eens, druk **F4**: groen met **TEE**. De drie rijen staan in de Sheet.
- [ ] 7. Scan **Pallet A**, druk **Esc**. Grijs met **Geannuleerd**. Er komt geen rij bij.
- [ ] 8. Onderaan staan de laatste scans met een groen vinkje.

## B. Fouten

- [ ] 9. Scan **Locatie A03** zonder open pallet. Rood met **Eerst pallet scannen**, een lage dubbele toon, en geen rij.
- [ ] 10. Scan **Foute SSCC**. Rood met **controlecijfer fout**, en geen rij.
- [ ] 11. Scan **Andere barcode van het palletlabel**. Rood met **Geen SSCC**.
- [ ] 12. Scan **Pallet A**, daarna **Pallet B**. Rood met **Er staat nog een pallet open**. Pallet A blijft open.
- [ ] 13. Scan nu **Foute locatie**. Rood met **Onbekende barcode**. Pallet A blijft open.
- [ ] 14. Scan **Locatie B48**. Groen. In de Sheet staat pallet A op `B48`.
- [ ] 15. De toon bij groen en de toon bij rood zijn duidelijk verschillend, ook met draaiende heftruck.

## C. Toetsen en typen

- [ ] 16. Open ⚙ en druk op F1, F2, F3, F4 en Esc. Bij **Toetstest** verschijnt telkens een waarde. Verschijnt er niets, noteer welke toets en zie "Functietoetsen" in de README.
- [ ] 17. Typ een SSCC van een echt label met het toetsenbord en druk Enter. De pallet opent.
- [ ] 18. Typ `A03` en druk Enter. Groen, en de rij staat in de Sheet.
- [ ] 19. Scan **Pallet A** en scan de commando-barcode **Verzonden**. Groen met Verzonden.
- [ ] 20. Doe stap 2 tot 6 opnieuw met handschoenen aan, zonder het scherm aan te raken.

## D. Wifi en wachtrij

- [ ] 21. Zet de wifi uit. Doe drie volledige scans (pallet + locatie). **WACHTRIJ 3** is oranje, en de scans onderaan tonen ⏳ wacht.
- [ ] 22. Sluit de app volledig en start ze opnieuw, nog altijd zonder wifi. De app start, en WACHTRIJ staat nog op 3.
- [ ] 23. Zet de wifi aan. Binnen een halve minuut staat WACHTRIJ op 0.
- [ ] 24. In de Sheet staan de drie rijen één keer, in de volgorde waarin je scande, met het uur van de scan in kolom A en een later uur in kolom F.
- [ ] 25. Loop met het toestel naar de plek met de zwakste wifi en doe daar vijf scans. Geen enkele scan ontbreekt in de Sheet en geen enkele staat er dubbel.

## E. Twee toestellen (als er twee zijn)

- [ ] 26. Scan op beide toestellen tegelijk elk vijf pallets. In de Sheet staan tien rijen, met de juiste toestelnaam in kolom E.

## F. Echte labels

- [ ] 27. Scan een echt palletlabel door de wikkelfolie, vanop de heftruck. De pallet opent bij de eerste poging.
- [ ] 28. Staan er meerdere barcodes op het label: de scanner neemt de SSCC, of de app weigert de andere met **Geen SSCC**. Er wordt nooit een verkeerde code aanvaard.
- [ ] 29. Scan een rek-etiket vanop de heftruck, op de hoogste en de laagste plaats.
- [ ] 30. Lees het scherm vanop armlengte, in het donkerste en het helderste deel van het magazijn.

## Na de test

- [ ] Verwijder de testrijen uit het tabblad Scans.
- [ ] Noteer wat niet werkte, met het nummer van de stap en wat er op het scherm stond.
