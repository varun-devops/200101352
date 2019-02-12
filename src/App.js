import React, { Component } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
// import 'react-tabs/style/react-tabs.css';
import './App.css';
import Header from './components/Header/Header';
import SearchBar from './components/SearchBar/SearchBar';
import DataDisplay from './components/DataDisplay/DataDisplay';

const API = 'https://rata.digitraffic.fi/api/v1/';

class App extends Component {
  constructor(props){
    super(props);
    this.state = {
      isLoading:true,
      stations: [],
      passengerStations: [],
      todaysTrains: [],
      selectedStation: null,
      filteredData: [],
      tabIndex: 0
    }
  }

  handleInputChange = (selectedStation) => {
    this.setState({
      selectedStation
    });
    if (selectedStation && this.state.isLoading === false) {
      this.fetchAndFilterData(selectedStation);
      //this.filterData2(selectedStation);
    }
  }

  componentDidMount() {
    this.setState({ isLoading: true });
    this.fetchStations();
    this.fetchTodaysTrains();
  }

  fetchStations() {
    fetch(`${API}metadata/stations`)
    .then(response => response.json())
    .then(data => {
		console.log('TCL: App -> fetchStations -> data', data);
    
      const stations = data.map(station => ({ value: station.stationShortCode, label: station.stationName.includes(' asema') ? station.stationName.slice(0, -6) :  station.stationName}));
      const passengerStations = data.filter(station => station.passengerTraffic === true).map(station => ({ value: station.stationShortCode, label: station.stationName.includes(' asema') ? station.stationName.slice(0, -6) :  station.stationName}));
      this.setState({ stations, passengerStations, isLoading: false });  
    })
    .catch(error => console.log('parsing failed', error)
    );
  }

  fetchTodaysTrains() {
    this.setState({ isLoading: true});
    const dateNow = new Date().toISOString().slice(0, 10);
    fetch(`${API}trains/${dateNow}`)
    .then(response => response.json())
    .then(data => {
      console.log('TCL: App -> fetchTodaysTrains -> data', data);
      this.setState({todaysTrains: data, isLoading: true})
    })
    .catch(error => console.log(error));
  }

  filterData2(selectedStation) {
    const data = [];//this.state.todaysTrains;
    // const filteredData = data.filter(train => train.timeTableRows.filter(timeEntry => timeEntry.stationShortCode === selectedStation.value));
    const filteredData = data.map(train => train.filter(train.timeTableRows.filter(timeEntry => timeEntry.stationShortCode === selectedStation.value)));
		console.log('TCL: App -> filteredData', filteredData);
    
  }
  
  formatTime(dateTime) {
    return new Intl.DateTimeFormat('fi-FI', { hour: 'numeric', minute: 'numeric'}).format(new Date(dateTime.toString()));
  }

  fetchAndFilterData(selectedStation) { 
    const dateTimeNow = new Date().toJSON(); 
    const data = this.state.todaysTrains;
    //fetch(`${API}live-trains/station/${selectedStation.value}`)
    //.then(response => response.json())
    //.then(data => {
    //console.log('TCL: fetchAndFilterData -> data', data);
    const filteredData = data.map((train => {
      const trainNumber = train.trainType + ' ' + train.trainNumber;
      const originShortCode = train.timeTableRows[0].stationShortCode;
      const origin = this.state.stations.find(station => station.value === originShortCode).label;
      const destinationShortCode = train.timeTableRows[train.timeTableRows.length - 1]['stationShortCode'];
      const destination = this.state.stations.find(station => station.value === destinationShortCode).label;
      
      let scheduledArrivalTime; // arrivals
      let actualArrivalTime;
      const arrivalTimeTable = {...train.timeTableRows.filter(element => element.stationShortCode === selectedStation.value && element.type === 'ARRIVAL')[0]};
      if(arrivalTimeTable) {
        if (arrivalTimeTable.hasOwnProperty('scheduledTime')) {
          scheduledArrivalTime = arrivalTimeTable.scheduledTime;  
        }
        if(arrivalTimeTable.hasOwnProperty('actualTime')) {
         actualArrivalTime =  arrivalTimeTable.actualTime;  
        } else if (arrivalTimeTable.hasOwnProperty('liveEstimateTime')) {
         actualArrivalTime = arrivalTimeTable.liveEstimateTime;
        } else {
         actualArrivalTime = false;
        }
      } 
      let scheduledDepartureTime; // departures
      let actualDepartureTime;
      const departureTimeTable = {...train.timeTableRows.filter(element => element.stationShortCode === selectedStation.value && element.type === 'DEPARTURE')[0]}
      if(departureTimeTable) {
        if (departureTimeTable.hasOwnProperty('scheduledTime')) {
          scheduledDepartureTime = departureTimeTable.scheduledTime;
        }
        if(departureTimeTable.hasOwnProperty('actualTime')) {
         actualDepartureTime =  departureTimeTable.actualTime;
        } else if (departureTimeTable.hasOwnProperty('liveEstimateTime')) {
         actualDepartureTime = departureTimeTable.liveEstimateTime;
        } else {
         actualDepartureTime = false;
        }
      }

      return {...train, trainNumber, origin, destination, scheduledArrivalTime, actualArrivalTime,  scheduledDepartureTime, actualDepartureTime};
    }))
    .filter(train => train.trainCategory !== 'Cargo')
    .filter(train => train.actualArrivalTime > dateTimeNow || train.scheduledArrivalTime > dateTimeNow || train.actualDepartureTime > dateTimeNow || train.scheduledDepartureTime > dateTimeNow)
    ; 
    
    
    console.log('TCL: App -> fetchAndFilterData -> dateTimeNow', dateTimeNow);

    
     
    this.setState({filteredData});
		console.log('TCL: App -> fetchAndFilterData -> filteredData', filteredData)
    }
    //)
    //.catch(error => console.log('parsing failed', error)
    //);
  //}

  render() {  
    return (
      <div className="App">
        <Header title="Aseman junatiedot" />
        <SearchBar 
        placeholder="Hae aseman nimellä"
        noOptionsMessage={(inputValue) => "Ei löydetty"}
        options={this.state.passengerStations} 
        onChange={this.handleInputChange} 
        />
        <Tabs selectedIndex={this.state.tabIndex} onSelect={tabIndex => this.setState({ tabIndex })}>
          <TabList>
              <Tab>Saapuvat</Tab>
              <Tab>Lähtevät</Tab>
          </TabList>
          <TabPanel>
            <DataDisplay  
            display='arrival' 
            filteredData={this.state.filteredData} 
            />   
          </TabPanel>
          <TabPanel>
            <DataDisplay  
            display='departure' 
            filteredData={this.state.filteredData} 
            />   
          </TabPanel>
        </Tabs>
      </div>
    );
  }
}

export default App;
