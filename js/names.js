// Name pools for generated players (clubs whose real squads aren't in a pack yet).
// Each country gets a home pool plus a small share of names from abroad.
'use strict';
const NAMES = {
  ENG: {
    first: ['Jack','Harry','George','Charlie','Jacob','Thomas','Oliver','James','William','Joshua','Daniel','Samuel','Alfie','Joe','Ryan','Lewis','Callum','Jordan','Connor','Kieran','Luke','Ben','Sam','Matt','Adam','Liam','Josh','Tom','Jake','Will','Ethan','Mason','Tyler','Reece','Kyle','Nathan','Aaron','Scott','Dan','Max','Billy','Alex','Ollie','Archie','Freddie','Jamie','Owen','Rhys','Cameron','Elliot','Louis','Dylan','Toby','Kai','Jaden','Marcus','Dominic','Rico','Tayo','Kwame','Femi','Tobi','Andre','Jayden','Nathaniel','Corey','Brandon','Bradley','Lee','Craig','Dean','Gary','Mark','Paul','Danny','Jordan','Ashley','Sean','Declan','Cian','Conor','Ciaran','Finn','Fraser','Euan','Gethin','Ieuan','Morgan'],
    last: ['Smith','Jones','Taylor','Brown','Williams','Wilson','Johnson','Davies','Robinson','Wright','Thompson','Evans','Walker','White','Roberts','Green','Hall','Wood','Jackson','Clarke','Harris','Lewis','Turner','Martin','Cooper','Hill','Ward','Hughes','Moore','Clark','King','Harrison','Morgan','Baker','Allen','Mitchell','Young','Bennett','Carter','Phillips','Watson','Shaw','Bailey','Parker','Price','Lee','Davis','Marsh','Knight','Simpson','Dixon','Cole','Grant','Barnes','Fletcher','Holmes','Reid','Murray','Kelly','Stevens','Webb','Payne','Mills','Rose','Pearce','Hunt','Ellis','Lloyd','Dawson','Gibson','Doyle','Burke','Sheridan','Quinn','Byrne','McCarthy','Gallagher','Fraser','Campbell','Stewart','Robertson','Ferguson','Owen','Rees','Powell','Griffiths','Okafor','Adeyemi','Mensah','Boateng','Asante','Sterling','Francis','Grant','Bryan','Campbell'],
  },
  ABROAD: {
    first: ['Luca','Matteo','Lucas','Mateo','Hugo','Théo','Nils','Jonas','Erik','Mikkel','Kasper','Sander','Bram','Daan','Ruben','Diogo','Tiago','Pedro','João','Marco','Igor','Luka','Filip','Milan','Kenji','Yuto','Min-jae','Moussa','Ibrahim','Youssef','Amadou','Sékou','Kofi','Emeka','Chidi','Cristian','Santiago','Nicolás','Julián','Ángel'],
    last: ['Rossi','Bianchi','Moreau','Lefèvre','Müller','Schmidt','Andersen','Nielsen','Larsen','Johansson','de Vries','Bakker','Jansen','Silva','Santos','Ferreira','Costa','Horvat','Kovač','Novak','Petrović','Tanaka','Suzuki','Kim','Diallo','Traoré','Koné','Mensah','Okoye','Eze','González','Fernández','López','Martínez','Rodríguez'],
  },
};
if (typeof module !== 'undefined') module.exports = NAMES;
