// England 2026/27 real squads: Premier League in full, Championship clubs relegated from the PL in full,
// other Championship clubs with known players topped up by the generator.
// Squads follow confirmed moves to the end of the summer 2026 window (ESPN/TNT lists); ratings are Touchline's own estimates.
// Line: Name|Position|Age (Aug 2026)|Rating|Potential(optional)|Nation
// Positions: GK CB LB RB CDM CM CAM LM RM LW RW ST
// Private build only: real names are for Sudhi's personal copy.
'use strict';
(function (W) {
  const P = W.addSquad;

  P('arsenal', `
David Raya|GK|30|88||ESP
Kepa Arrizabalaga|GK|31|80||ESP
Illan Meslier|GK|26|77||FRA
William Saliba|CB|25|89||FRA
Gabriel Magalhães|CB|28|88||BRA
Ezri Konsa|CB|28|83||ENG
Piero Hincapié|CB|24|83|86|ECU
Cristhian Mosquera|CB|22|79|85|ESP
Jurriën Timber|RB|25|85|87|NED
Ben White|RB|28|82||ENG
Riccardo Calafiori|LB|24|82|85|ITA
Myles Lewis-Skelly|LB|19|79|88|ENG
Declan Rice|CDM|27|89||ENG
Martín Zubimendi|CDM|27|87||ESP
Bruno Guimarães|CM|28|86||BRA
Mikel Merino|CM|30|84||ESP
Martin Ødegaard|CAM|27|87||NOR
Eberechi Eze|CAM|28|85||ENG
Max Dowman|CAM|16|70|91|ENG
Bukayo Saka|RW|24|89|90|ENG
Noni Madueke|RW|24|81|84|ENG
Gabriel Martinelli|LW|25|83||BRA
Christos Tzolis|LW|24|80|83|GRE
Viktor Gyökeres|ST|28|87||SWE
Kai Havertz|ST|27|83||GER
`);
  P('villa', `
Zion Suzuki|GK|24|80|84|JPN
Marco Bizot|GK|35|75||NED
Pau Torres|CB|29|83||ESP
Tyrone Mings|CB|33|78||ENG
Victor Lindelöf|CB|32|77||SWE
Taylor Harwood-Bellis|CB|24|77|80|ENG
Modou Keba Cissé|CB|25|76||GAM
Matty Cash|RB|29|80||POL
Aaron Wan-Bissaka|RB|28|80||COD
Ian Maatsen|LB|24|80|83|NED
Matteo Ruggeri|LB|24|78||ITA
Boubacar Kamara|CDM|26|84||FRA
Amadou Onana|CDM|25|83|85|BEL
João Gomes|CM|25|82|84|BRA
Leon Goretzka|CM|31|82||GER
John McGinn|CM|31|82||SCO
Johan Manzambi|CM|21|80|86|SUI
Lamare Bogarde|CDM|22|74|80|NED
Ross Barkley|CAM|32|77||ENG
Emiliano Buendía|CAM|29|79||ARG
Alejandro Garnacho|LW|22|81|85|ARG
Ibrahim Mbaye|RW|18|72|85|SEN
Nicolas Jackson|ST|25|81|83|SEN
Tammy Abraham|ST|28|78||ENG
`);
  P('bournemouth', `
Djordje Petrović|GK|26|81|83|SRB
Michele Di Gregorio|GK|29|81||ITA
Christos Mandas|GK|24|77||GRE
António Silva|CB|22|80|85|POR
Bafodé Diakité|CB|25|79||FRA
James Hill|CB|24|75||ENG
Veljko Milosavljević|CB|19|74|83|SRB
Adrien Truffert|LB|24|80|82|FRA
Julio Soler|LB|21|74|80|ARG
Juanlu Sánchez|RB|23|78|81|ESP
Adam Smith|RB|35|73||ENG
Tyler Adams|CDM|27|81||USA
Alex Scott|CM|23|79|84|ENG
Lewis Cook|CM|29|77||ENG
Ryan Christie|CM|31|76||SCO
Alex Tóth|CM|20|72|80|HUN
Marcus Tavernier|LM|27|79||ENG
Justin Kluivert|CAM|27|81||NED
David Brooks|RW|29|76||WAL
Amine Adli|RW|26|79||MAR
Rayan|RW|20|76|84|BRA
Álvaro Rodríguez|ST|22|75|80|ESP
Evanilson|ST|26|80||BRA
Eli Junior Kroupi|ST|20|76|84|FRA
Enes Ünal|ST|29|75||TUR
`);
  P('brentford', `
Caoimhín Kelleher|GK|27|82||IRL
Hákon Valdimarsson|GK|24|72||ISL
Nathan Collins|CB|25|81||IRL
Sepp van den Berg|CB|24|79|82|NED
Kristoffer Ajer|CB|28|77||NOR
Jannik Schuster|CB|20|74|81|AUT
Aaron Hickey|RB|24|77||SCO
Michael Kayode|RB|22|77|82|ITA
Rico Henry|LB|29|76||ENG
Keane Lewis-Potter|LB|25|77||ENG
El Hadji Malick Diouf|LB|21|77|82|SEN
Vitaly Janelt|CDM|28|77||GER
Yehor Yarmoliuk|CM|22|76|80|UKR
Mamadou Sangaré|CM|23|76|80|MLI
Mikkel Damsgaard|CAM|26|81||DEN
Fábio Carvalho|CAM|24|76||POR
Kevin Schade|LW|24|79|81|GER
Jaidon Anthony|LW|26|77||ENG
Dango Ouattara|RW|24|80|82|BUR
Kaye Furo|ST|21|72|79|BEL
Igor Thiago|ST|25|81|83|BRA
Callum Wilson|ST|34|75||ENG
`);
  P('brighton', `
Bart Verbruggen|GK|24|82|85|NED
Jason Steele|GK|35|70||ENG
Lewis Dunk|CB|34|79||ENG
Luka Vušković|CB|19|79|88|CRO
Pascal Struijk|CB|27|77||NED
Olivier Boscagli|CB|28|77||FRA
Michael Svoboda|CB|27|75||AUT
Ferdi Kadıoğlu|RB|26|81||TUR
Costinha|RB|26|76||POR
Maxim De Cuyper|LB|25|79||BEL
Jaouen Hadjam|LB|23|76|80|ALG
Mats Wieffer|CDM|26|79||NED
Yasin Ayari|CM|22|78|83|SWE
Jack Hinshelwood|CM|21|77|83|ENG
Pascal Groß|CM|35|78||GER
Matt O'Riley|CAM|25|78||DEN
Diego Gómez|CM|23|78|82|PAR
Georginio Rutter|CAM|24|80|83|FRA
Kaoru Mitoma|LW|29|81||JPN
Yankuba Minteh|RW|22|79|84|GAM
Tommy Watson|RW|20|72|80|ENG
Stefanos Tzimas|ST|20|75|83|GRE
Charalampos Kostoulas|ST|19|74|84|GRE
Promise David|ST|24|75||CAN
`);
  P('chelsea', `
Emiliano Martínez|GK|34|84||ARG
Mike Penders|GK|21|74|84|BEL
Levi Colwill|CB|23|84|88|ENG
Wesley Fofana|CB|25|80||FRA
Maxence Lacroix|CB|26|81||FRA
Josh Acheampong|CB|20|76|84|ENG
Reece James|RB|26|85||ENG
Malo Gusto|RB|23|81|84|FRA
Marco Palestra|RB|21|80|86|ITA
Jorrel Hato|LB|20|80|87|NED
Valentín Barco|LB|22|77|81|ARG
Moisés Caicedo|CDM|24|88|89|ECU
Roméo Lavia|CDM|22|80|85|BEL
Jordan Henderson|CM|36|76||ENG
Cole Palmer|CAM|24|87|89|ENG
Morgan Rogers|CAM|24|85|88|ENG
Pedro Neto|RW|26|83||POR
Estêvão|RW|19|81|90|BRA
Geovany Quenda|RW|19|78|87|POR
Jamie Gittens|LW|22|80|85|ENG
João Pedro|ST|24|83|85|BRA
Emmanuel Emegha|ST|23|77|81|NED
Danny Welbeck|ST|35|75||ENG
`);
  P('coventry', `
Carl Rushworth|GK|25|74|77|ENG
Oliver Dovin|GK|24|70||SWE
Dan Bentley|GK|33|70||ENG
Bobby Thomas|CB|25|73||ENG
Liam Kitching|CB|26|73||ENG
Ethan Pinnock|CB|33|74||JAM
Aurèle Amenda|CB|22|73|78|SUI
Joel Latibeaudiere|CB|26|72||JAM
Milan van Ewijk|RB|25|75||NED
Jay Dasilva|LB|27|72||ENG
Jake Bidwell|LB|33|70||ENG
Frank Onyeka|CDM|28|74||NGA
Ben Sheaf|CDM|28|72||ENG
Matt Grimes|CM|31|73||ENG
Victor Torp|CM|26|73||DEN
Josh Eccles|CM|26|70||ENG
Gustavo Hamer|CAM|29|75||NED
Jack Rudoni|CAM|25|75||ENG
Caleb Yirenkyi|CM|20|70|78|GHA
Tatsuhiro Sakamoto|RW|29|73||JPN
Ephron Mason-Clark|LW|26|73||ENG
Loum Tchaouna|RW|23|74|77|FRA
Haji Wright|ST|28|75||USA
Ellis Simms|ST|25|73||ENG
Taiwo Awoniyi|ST|29|74||NGA
Brandon Thomas-Asante|ST|27|72||GHA
Sidiki Cherif|ST|20|71|78|FRA
`);
  P('palace', `
Dean Henderson|GK|29|82||ENG
Walter Benítez|GK|33|75||ARG
Chris Richards|CB|26|79||USA
Axel Disasi|CB|28|77||FRA
Jaydee Canvot|CB|20|73|80|FRA
Honest Ahanor|CB|18|72|84|ITA
Takehiro Tomiyasu|CB|27|77||JPN
Óscar Mingueza|RB|27|77||ESP
Tyrick Mitchell|LB|27|79||ENG
Ben Chilwell|LB|29|74||ENG
Adam Wharton|CM|22|83|88|ENG
Cheick Doucouré|CDM|26|77||MLI
Will Hughes|CM|31|75||ENG
Quentin Timber|CM|25|77||NED
Justin Devenny|CM|22|72|77|NIR
Daichi Kamada|CAM|30|79||JPN
Yeremy Pino|RW|23|79|83|ESP
Ismaïla Sarr|RW|28|81||SEN
Dwight McNeil|LW|26|76||ENG
Anan Khalaili|RW|22|74|79|ISR
Jean-Philippe Mateta|ST|29|81||FRA
Jørgen Strand Larsen|ST|26|79||NOR
Evann Guessand|ST|25|77||CIV
Eddie Nketiah|ST|27|75||ENG
`);
  P('everton', `
Jordan Pickford|GK|32|84||ENG
Mark Travers|GK|27|74||IRL
Jarrad Branthwaite|CB|24|81|85|ENG
James Tarkowski|CB|33|79||ENG
Michael Keane|CB|33|75||ENG
Jake O'Brien|RB|25|76||IRL
Ainsley Maitland-Niles|RB|28|73||ENG
Vitaliy Mykolenko|LB|27|77||UKR
James Garner|CM|25|79||ENG
Christian Nørgaard|CDM|32|77||DEN
Hayden Hackney|CM|24|76|80|ENG
Merlin Röhl|CM|23|75|80|GER
Kiernan Dewsbury-Hall|CM|27|78||ENG
Carlos Alcaraz|CAM|23|75|79|ARG
Jack Grealish|LW|30|80||ENG
Brennan Johnson|RW|25|79||WAL
Tyler Dibling|RW|20|76|84|ENG
Tyrique George|LW|20|74|81|ENG
Thierno Barry|ST|24|76|80|FRA
`);
  P('fulham', `
Bernd Leno|GK|34|80||GER
Benjamin Lecomte|GK|35|70||FRA
Joachim Andersen|CB|30|79||DEN
Calvin Bassey|CB|26|77||NGA
Jorge Cuenca|CB|26|74||ESP
David Affengruber|CB|25|75||AUT
Kenny Tete|RB|30|77||NED
Timothy Castagne|RB|30|76||BEL
Antonee Robinson|LB|29|80||USA
Ryan Sessegnon|LB|26|74||ENG
Sander Berge|CDM|28|78||NOR
Harrison Reed|CDM|31|74||ENG
Hugo Larsson|CM|22|78|83|SWE
Shea Charles|CDM|22|75|79|NIR
Tom Cairney|CM|35|72||SCO
Emile Smith Rowe|CAM|26|78||ENG
Andreas Pereira|CAM|30|78||BRA
Josh King|CAM|19|72|81|ENG
Alex Iwobi|RW|30|79||NGA
Oscar Bobb|RW|23|76|80|NOR
Manuel Ángel|CM|21|72|79|ESP
César Palacios|CAM|22|72|78|ESP
Rodrigo Muniz|ST|25|77||BRA
Gonzalo García|ST|22|78|84|ESP
Jonah Kusi-Asare|ST|19|72|81|SWE
`);
  P('hull', `
Jack Butland|GK|33|74||ENG
Konstantinos Tzolakis|GK|24|72||GRE
Nobel Mendy|CB|21|73|79|SEN
Charlie Hughes|CB|22|70||ENG
John Egan|CB|33|70||IRL
Lucas Herrington|CB|19|68|77|AUS
Brooke Norton-Cuffy|RB|22|72|77|ENG
Matt Targett|LB|31|72||ENG
Ryan Giles|LB|26|71||ENG
Hidemasa Morita|CM|31|77||JPN
Lucas Gourna-Douath|CDM|22|73|78|FRA
Tim Iroegbunam|CDM|23|72|76|ENG
Christos Mouzakitis|CM|19|71|80|GRE
Regan Slater|CM|26|69||ENG
Óscar Zambrano|CM|22|71|76|ECU
Jens Hjerto-Dahl|CM|20|69|76|NOR
Mohamed-Ali Cho|LW|22|75|80|FRA
Sorba Thomas|RW|27|70||WAL
Robinio Vaz|ST|19|72|81|FRA
Joe Gelhardt|ST|24|72||ENG
Ilyas Ansah|ST|21|71|77|GER
Oli McBurnie|ST|30|70||SCO
`);
  P('ipswich', `
Alex Palmer|GK|29|73||ENG
Kjell Scherpen|GK|26|71||NED
Christian Walton|GK|31|70||ENG
Cedric Kipre|CB|29|73||CIV
Issa Diop|CB|29|74||FRA
Dara O'Shea|CB|27|74||IRL
Jacob Greaves|CB|26|73||ENG
Darnell Furlong|RB|30|71||ENG
Ben Johnson|RB|26|71||ENG
Leif Davis|LB|26|75||ENG
Azor Matusiwa|CDM|28|73||NED
Saša Lukić|CM|29|75||SRB
Jens Cajuste|CM|26|74||SWE
Florentino Luís|CDM|27|74||POR
Exequiel Palacios|CM|27|79||ARG
Jack Taylor|CM|28|71||IRL
Julio Enciso|CAM|22|76|81|PAR
Jack Clarke|LW|25|75||ENG
Abdul Fatawu|RW|22|75|80|GHA
Daizen Maeda|LW|28|78||JPN
Zian Flemming|ST|28|74||NED
Chuba Akpom|ST|30|72||ENG
Emersonn|ST|21|71|78|BRA
`);
  P('leeds', `
James Trafford|GK|23|80|85|ENG
Michael Zetterer|GK|31|74||GER
Joe Rodon|CB|28|78||WAL
Jaka Bijol|CB|27|79||SVN
Nico Elvedi|CB|29|77||SUI
Tarik Muharemović|CB|23|75|80|BIH
Jayden Bogle|RB|25|77||ENG
James Justin|RB|28|76||ENG
Gabriel Gudmundsson|LB|27|76||SWE
Melvin Bard|LB|25|75||FRA
Ethan Ampadu|CDM|25|78||WAL
Anton Stach|CM|27|79||GER
Ao Tanaka|CM|27|77||JPN
Sean Longstaff|CM|28|76||ENG
Ilia Gruev|CDM|26|74||BUL
Brenden Aaronson|CAM|25|77||USA
Facundo Buonanotte|CAM|21|75|81|ARG
Harry Wilson|RW|29|77||WAL
Daniel James|RW|28|76||WAL
Noah Okafor|LW|26|77||SUI
Jean-Matteo Bahoya|LW|21|74|80|FRA
Dominic Calvert-Lewin|ST|29|77||ENG
Lukas Nmecha|ST|27|75||GER
`);
  P('liverpool', `
Alisson|GK|33|87||BRA
Giorgi Mamardashvili|GK|25|83|86|GEO
Freddie Woodman|GK|29|68||ENG
Virgil van Dijk|CB|35|87||NED
Ronald Araújo|CB|27|82||URU
Jérémy Jacquet|CB|21|80|86|FRA
Joe Gomez|CB|29|78||ENG
Giovanni Leoni|CB|19|77|86|ITA
Lucca Brughmans|CB|20|73|80|BEL
Jeremie Frimpong|RB|25|83||NED
Conor Bradley|RB|23|79|83|NIR
Milos Kerkez|LB|22|82|86|HUN
Ryan Gravenberch|CDM|24|85|87|NED
Wataru Endo|CDM|33|77||JPN
Alexis Mac Allister|CM|27|86||ARG
Dominik Szoboszlai|CM|25|85|86|HUN
Trey Nyoni|CM|19|73|85|ENG
Florian Wirtz|CAM|23|88|91|GER
Bradley Barcola|LW|24|84|87|FRA
Cody Gakpo|LW|27|84||NED
Víctor Muñoz|LW|22|77|82|ESP
Rio Ngumoha|LW|18|74|86|ENG
Federico Chiesa|RW|28|78||ITA
Alexander Isak|ST|26|88||SWE
Hugo Ekitike|ST|24|84|87|FRA
`);
  P('mancity', `
Gianluigi Donnarumma|GK|27|89||ITA
Gerónimo Rulli|GK|34|79||ARG
Rúben Dias|CB|29|86||POR
Joško Gvardiol|CB|24|86|87|CRO
Marc Guéhi|CB|26|85||ENG
Abdukodir Khusanov|CB|22|80|85|UZB
Vitor Reis|CB|20|75|84|BRA
Rico Lewis|RB|21|80|84|ENG
Matheus Nunes|RB|27|81||POR
Rayan Aït-Nouri|LB|25|82||ALG
Nico O'Reilly|LB|21|79|85|ENG
Ayyoub Bouaddi|CDM|18|79|90|FRA
Mateo Kovačić|CM|32|80||CRO
Elliot Anderson|CM|23|84|88|ENG
Enzo Fernández|CM|25|86||ARG
Allan Elias|CM|19|74|83|BRA
Phil Foden|CAM|26|86||ENG
Rayan Cherki|CAM|22|84|88|FRA
Jérémy Doku|LW|24|84|86|BEL
Iliman Ndiaye|LW|26|81||SEN
Antoine Semenyo|RW|26|83||GHA
Erling Haaland|ST|26|91||NOR
`);
  P('manutd', `
Senne Lammens|GK|24|80|84|BEL
Karl Darlow|GK|36|70||WAL
Tom Heaton|GK|40|62||ENG
Lisandro Martínez|CB|28|83||ARG
Matthijs de Ligt|CB|27|82||NED
Leny Yoro|CB|20|80|87|FRA
Harry Maguire|CB|33|78||ENG
Ayden Heaven|CB|19|74|83|ENG
Diogo Dalot|RB|27|79||POR
Noussair Mazraoui|RB|28|79||MAR
Patrick Dorgu|LB|21|78|84|DEN
Luke Shaw|LB|31|77||ENG
Carlos Baleba|CDM|22|82|87|CMR
Manuel Ugarte|CDM|25|79||URU
Kobbie Mainoo|CM|21|80|86|ENG
Andrey Santos|CM|22|80|85|BRA
Youri Tielemans|CM|29|81||BEL
Bruno Fernandes|CAM|31|87||POR
Mason Mount|CAM|27|78||ENG
Amad Diallo|RW|24|81|84|CIV
Bryan Mbeumo|RW|27|84||CMR
Matheus Cunha|LW|27|84||BRA
Benjamin Šeško|ST|23|82|87|SVN
Joshua Zirkzee|ST|25|76||NED
Chido Obi|ST|18|71|83|DEN
`);
  P('newcastle', `
Nick Pope|GK|34|80||ENG
Aaron Ramsdale|GK|28|79||ENG
Sven Botman|CB|26|81||NED
Malick Thiaw|CB|25|80|82|GER
Fabian Schär|CB|34|78||SUI
Dan Burn|CB|34|78||ENG
Tino Livramento|RB|23|80|84|ENG
Amar Dedić|RB|23|79|82|BIH
Lewis Hall|LB|21|80|85|ENG
Joelinton|CM|30|81||BRA
Nico González|CDM|24|80|83|ESP
Lewis Miley|CM|20|77|84|ENG
Jacob Ramsey|CM|25|78||ENG
Joe Willock|CM|27|76||ENG
Sean Steur|CM|19|72|82|NED
Anthony Elanga|RW|24|80|83|SWE
Jacob Murphy|RW|31|77||ENG
Harvey Barnes|LW|28|79||ENG
Bazoumana Touré|LW|20|76|84|CIV
Matías Fernández-Pardo|RW|21|76|82|BEL
Yoane Wissa|ST|29|81||COD
William Osula|ST|23|75|79|DEN
`);
  P('forest', `
Matz Sels|GK|34|81||BEL
John Victor|GK|30|73||BRA
Murillo|CB|24|83|86|BRA
Nikola Milenković|CB|28|82||SRB
Ousmane Diomandé|CB|22|80|86|CIV
Zach Abbott|CB|20|70|77|ENG
Ola Aina|RB|29|79||NGA
Neco Williams|RB|25|78||WAL
Daniel Muñoz|RB|30|81||COL
Luca Netz|LB|23|75|79|GER
Xaver Schlager|CDM|28|80||AUT
Ibrahim Sangaré|CDM|28|78||CIV
Nicolás Domínguez|CM|28|77||ARG
Douglas Luiz|CM|28|78||BRA
Ryan Yates|CM|28|75||ENG
Morgan Gibbs-White|CAM|26|83||ENG
James McAtee|CAM|23|77|81|ENG
Callum Hudson-Odoi|LW|25|79||ENG
Dan Ndoye|RW|25|80||SUI
Chris Wood|ST|34|79||NZL
Liam Delap|ST|23|78|83|ENG
Igor Jesus|ST|25|77||BRA
`);
  P('sunderland', `
Robin Roefs|GK|23|78|83|NED
Simon Moore|GK|36|64||ENG
Dan Ballard|CB|26|76||NIR
Omar Alderete|CB|29|76||PAR
Nordi Mukiele|CB|28|77||FRA
Kevin Danso|CB|27|78||AUT
Luke O'Nien|CB|31|72||ENG
Lutsharel Geertruida|RB|26|77||NED
Trai Hume|RB|24|75||NIR
Thomas Meunier|RB|34|74||BEL
Reinildo|LB|32|76||MOZ
Granit Xhaka|CDM|33|82||SUI
Noah Sadiki|CDM|21|77|83|COD
Habib Diarra|CM|22|78|83|SEN
Enzo Le Fée|CM|26|79||FRA
Chris Rigg|CM|19|75|84|ENG
Chemsdine Talbi|RW|21|76|81|MAR
Malick Fofana|LW|21|80|86|BEL
Nilson Angulo|LW|23|74||ECU
Romaine Mundle|LW|23|70||ENG
Wilson Isidor|ST|26|77||FRA
Brian Brobbey|ST|24|77|80|NED
Eliezer Mayenda|ST|21|73|78|ESP
`);
  P('tottenham', `
Antonín Kinský|GK|23|77|83|CZE
Martin Dúbravka|GK|37|74||SVK
Brandon Austin|GK|27|65||ENG
Micky van de Ven|CB|25|84|86|NED
Jan Paul van Hecke|CB|26|81||NED
Marcos Senesi|CB|29|79||ARG
Tosin Adarabioyo|CB|28|77||ENG
Pedro Porro|RB|27|82||ESP
Archie Gray|RB|20|77|85|ENG
Destiny Udogie|LB|23|79|83|ITA
Andy Robertson|LB|32|79||SCO
Ben Davies|LB|33|74||WAL
Sandro Tonali|CDM|26|86||ITA
Rodrigo Bentancur|CM|29|78||URU
Conor Gallagher|CM|26|80||ENG
Lucas Bergvall|CM|20|79|86|SWE
Mateus Fernandes|CM|22|80|85|POR
James Maddison|CAM|29|81||ENG
Xavi Simons|CAM|23|83|87|NED
Dejan Kulusevski|RW|26|82||SWE
Mohammed Kudus|RW|26|82||GHA
Savinho|RW|22|81|86|BRA
Wilson Odobert|LW|21|76|81|FRA
Mathys Tel|LW|21|77|83|FRA
Mykhailo Mudryk|LW|25|75||UKR
Omar Marmoush|ST|27|81||EGY
Dominic Solanke|ST|28|79||ENG
Richarlison|ST|29|76||BRA
`);

  // ---------- Championship ----------
  P('westham', `
Alphonse Areola|GK|33|78||FRA
Mads Hermansen|GK|26|77||DEN
Max Kilman|CB|29|79||ENG
Jean-Clair Todibo|CB|26|78||FRA
Konstantinos Mavropanos|CB|28|77||GRE
Morato|CB|25|74||BRA
Kyle Walker-Peters|RB|29|76||ENG
Ollie Scarles|LB|20|72|79|ENG
Tomáš Souček|CM|31|78||CZE
Guido Rodríguez|CDM|32|76||ARG
Soungoutou Magassa|CDM|22|74|80|FRA
Freddie Potts|CM|22|72|77|ENG
Crysencio Summerville|LW|24|78|81|NED
Jarrod Bowen|RW|29|82||ENG
Adama Traoré|RW|30|75||ESP
Manor Solomon|LW|27|74||ISR
Divine Mukasa|CAM|19|70|80|ENG
Valentín Castellanos|ST|27|78||ARG
Joël Piroe|ST|27|74||NED
`);
  P('burnley', `
Max Weiß|GK|22|72|78|GER
Václav Hladký|GK|35|66||CZE
Maxime Estève|CB|24|77|80|FRA
Hjalmar Ekdal|CB|27|72||SWE
Axel Tuanzebe|CB|28|72||COD
Igor Julio|CB|28|73||BRA
Kyle Walker|RB|36|76||ENG
Connor Roberts|RB|30|71||WAL
Quilindschy Hartman|LB|24|73||NED
Lucas Pires|LB|25|72||BRA
Josh Cullen|CDM|30|74||IRL
Lesley Ugochukwu|CDM|22|74|79|FRA
Josh Laurent|CM|31|72||ENG
Hannibal Mejbri|CAM|23|74|78|TUN
Marcus Edwards|RW|27|73||ENG
Largie Ramazani|LW|25|73||BEL
Jacob Bruun Larsen|LW|27|72||DEN
Lyle Foster|ST|26|74||RSA
Armando Broja|ST|25|73||ALB
Ashley Barnes|ST|36|66||AUT
`);
  P('wolves', `
José Sá|GK|33|77||POR
Sam Johnstone|GK|33|74||ENG
Emmanuel Agbadou|CB|29|76||CIV
Santiago Bueno|CB|27|74||URU
Toti Gomes|CB|27|75||POR
Yerson Mosquera|CB|25|75||COL
Ladislav Krejčí|CB|27|76||CZE
Kieran Trippier|RB|35|75||ENG
Jackson Tchatchoua|RB|25|73||CMR
Matt Doherty|RB|34|72||IRL
Hugo Bueno|LB|23|74|78|ESP
David Møller Wolfe|LB|24|72||NOR
André|CDM|25|78||BRA
Marshall Munetsi|CM|30|73||ZIM
Jean-Ricner Bellegarde|CAM|28|74||HAI
Angel Gomes|CAM|26|76||ENG
Rodrigo Gomes|RW|23|74||POR
Fer López|CAM|22|75|80|ESP
Mateus Mané|RW|19|72|81|POR
Hwang Hee-chan|LW|30|75||KOR
Tolu Arokodare|ST|26|74||NGA
Raúl Jiménez|ST|35|74||MEX
Adam Armstrong|ST|29|73||ENG
`);
  P('southampton', `
Daniel Peretz|GK|26|73||ISR
Jan Bednarek|CB|30|73||POL
Flynn Downes|CDM|27|72||ENG
Will Smallbone|CM|26|71||IRL
Ryan Manning|LB|30|71||IRL
Cyle Larin|ST|31|72||CAN
Ross Stewart|ST|30|70||SCO
`);
  P('boro', `
Sol Brynn|GK|25|70||ENG
Radek Vítek|GK|23|73|79|CZE
Riley McGree|CAM|27|73||AUS
Will Lankshear|ST|21|72|78|ENG
Sebastian Berhalter|CM|25|71||USA
Tommy Conway|ST|23|71|75|SCO
Delano Burgzorg|LW|27|71||NED
`);
  P('wrexham', `
Arthur Okonkwo|GK|25|68||ENG
Max Cleworth|CB|24|68||WAL
Ryan Longman|RW|25|68||ENG
Sam Smith|ST|28|69||ENG
`);
  P('sheffutd', `
Michael Cooper|GK|26|70||ENG
Callum O'Hare|CAM|28|71||ENG
Tyrese Campbell|ST|26|71||ENG
Kalvin Phillips|CDM|30|72||ENG
`);
  P('norwich', `
Kenny McLean|CM|34|69||SCO
Josh Sargent|ST|26|74||USA
Anis Ben Slimane|CAM|25|70||TUN
`);
  P('stoke', `
Million Manhoef|RW|24|71||NED
Junior Tchamadeu|RB|22|69|75|ENG
George Hirst|ST|27|69||ENG
`);
  P('millwall', `
Lukas Jensen|GK|27|69||DEN
Japhet Tanganga|CB|27|71||ENG
Femi Azeez|RW|25|70||ENG
`);
  P('portsmouth', `
Nicolas Schmid|GK|29|68||AUT
Callum Lang|LW|29|69||ENG
Colby Bishop|ST|29|69||ENG
`);
  P('watford', `
Imran Louza|CDM|27|71||MAR
Vakoun Issouf Bayo|ST|29|70||CIV
`);
  P('westbrom', `
Josh Griffiths|GK|25|70||ENG
Jed Wallace|RW|32|68||ENG
`);
  P('derby', `
Jacob Widell Zetterström|GK|28|69||SWE
Jerry Yates|ST|29|67||ENG
`);
  P('qpr', `
Paul Nardi|GK|32|69||FRA
Ilias Chair|CAM|28|71||MAR
`);
  P('swansea', `
Lawrence Vigouroux|GK|33|69||CHI
Ben Cabango|CB|26|70||WAL
`);
  P('blackburn', `
Aynsley Pears|GK|28|67||ENG
`);
  P('bristolcity', `
Max O'Leary|GK|29|69||IRL
Scott Twine|CAM|26|70||ENG
`);
  P('leicester', `
Jakub Stolarczyk|GK|25|67||POL
Jannik Vestergaard|CB|34|69||DEN
Harry Winks|CM|30|70||ENG
Jordan Ayew|RW|34|68||GHA
Liam Cullen|ST|27|65||WAL
Conor Chaplin|CAM|29|66||ENG
Wes Burns|RW|31|65||WAL
`);
  P('sheffwed', `
Barry Bannan|CM|36|64||SCO
Louie Barry|LW|23|64||ENG
`);
  P('salford', `
Macaulay Langstaff|ST|29|62||ENG
Luke Molyneux|RW|28|60||ENG
`);
})(WORLD);
