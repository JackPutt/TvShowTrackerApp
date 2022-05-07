import React, { useState, Component } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './custom.css'
import Login from './components/Login';
import Register from './components/Register';
import SeriesList from './components/SeriesList';
import Search from './components/Search';
import WatchList from './components/WatchList';
import EpisodeList from './components/EpisodeList';
import Loading from './components/Loading';

const App = () => {
	const [token, setToken] = useState([]);
	const [seriesList, setSeriesList] = useState([]);
	const [watchList, setWatchList] = useState([]);
	const [episodeList, setEpisodeList] = useState([]);
	const [searchValue, setSearchValue] = useState('');
	const [isLoading, setIsLoading] = useState(false);
  var host = 'https://tvshowtrackerapi.azurewebsites.net';
	//Login/Register functions
	const loginSubmit = async () => {
		//Grab values from login form
		var { uname, pass } = document.forms[0];

		await performLogin(uname.value, pass.value);
		
	}
	const performLogin = async (username, pwd) => {
		//Login in using api/login endpoint
		setIsLoading(true);
		await fetch(host + '/api/login', {
			method: "post",
			headers: { 'Content-Type': 'application/json' },
			body: '{ "username": "' + username + '", "password": "' + pwd + '" }'
		})
			.then(function (response) {
				if (response.ok) {
					console.log("Successfully logged in!");
					return response.json();
				}
				throw new Error(response.statusText);
			})
			.then(function (data) {
				setToken(data);
				getUsersWatchList(data.token, data.userId);
			})
			.catch(function (error) {
				console.log("Error: ", error);
			})
			.finally(function () {
				setIsLoading(false);
			});
	};
	const register = async () => {
		setIsLoading(true);
		var { uname, email, pass } = document.forms[1];

		//Login in using api/login endpoint
		await fetch(host + '/api/register', {
			method: "post",
			headers: { 'Content-Type': 'application/json' },
			body: '{ "username": "' + uname.value + '", "email":"' + email.value + '", "password": "' + pass.value + '","confirmPassword": "' + pass.value + '" }'
		})
			.then(function (response) {
				if (response.ok) {
					console.log("Successfully registered!");
					return response.json();
				}
				throw new Error(response.statusText);
			})
			.then(function () {
				performLogin(uname.value, pass.value);
			})
			.catch(function (error) {
				console.log("Error: ", error);
			})
			.finally(function () {
				setIsLoading(false);
            });
	}

	//Get series from IMDB
	const getSeriesFromIMDB = async (searchValue) => {
		setIsLoading(true);
		var url = `https://imdb-api.com/en/api/SearchSeries/k_01g497fb`;
		if (searchValue != null && searchValue.length > 0) {
			url += "/" + searchValue;
		}
		await fetch(url)
			.then(function (response) {
				if (response.ok) {
					return response.json();
				}
				throw new Error(response.statusText);
			})
			.then(data => {
				setSeriesList(data.results);
			})
			.catch(function (error) {
				console.log("Error: ", error);
			})
			.finally(function () {
				setIsLoading(false);
			});
	};
	const search = async () => {
		console.log(searchValue);
		await getSeriesFromIMDB(searchValue);
	}

	//Add to watch list functions
	const addToWatchList = async (series) => {
		setIsLoading(true);
		await fetch(host + '/api/series/', {
			method: "post",
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token.token
			},
			body: '{ "SeriesID": "' + series.id + '", "UserID": "' + token.userId + '", "SeriesTitle":"' + series.title + '", "SeriesDescription":"' + series.description + '","SeriesImage":"' + series.image + '" }'
		})
			.then(function (response) {
				if (response.ok) {
					return response.json()
				}
				throw new Error(response.statusText);
			})
			.then(function () {
				//Save season 1 - no IMDB endpoint to determine number of seasons
				addEpisodes(series.id, 1);
			})
			.then(function () {
				//Pull list of series added to users watch list
				getUsersWatchList(token.token, token.userId);
			})
			.catch(function (error) {
				console.log("Error: ", error);
			})
			.finally(function () {
				setIsLoading(false);
			});
	}
	const addEpisodes = async (seriesId, seasonNumber) => {
		//Get all episodes for given season
		await getSeasonEpisodes(seriesId, seasonNumber)
	};
	const addEpisode = async (seriesId, episode) => {
		await fetch(host + '/api/episode/', {
			method: "post",
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token.token
			},
			body: '{ "EpisodeID":"' + episode.id + '","SeriesID": "' + seriesId + '","UserID": "' + token.userId + '","EpisodeTitle": "' + episode.title + '","SeasonNumber": ' + episode.seasonNumber + ',"EpisodeImage": "' + episode.image + '","EpisodeNumber": ' + episode.episodeNumber + ',"Watched":false}'
		})
			.then(function (response) {
				if (response.ok) {
					console.log(response.json());
					return response.json()
				}
				throw new Error(response.statusText);
			})
			.catch(function (error) {
				console.log("Error: ", error);
			});
	};
	const getSeasonEpisodes = async (seriesId, seasonNumber) => {
		setIsLoading(true);
		await fetch('https://imdb-api.com/en/api/SeasonEpisodes/k_01g497fb/' + seriesId + '/' + seasonNumber)
			.then(function (response) {
				if (response.ok) {
					return response.json()
				}
				throw new Error(response.statusText);
			})
			.then(function (data) {
				//loop through episodes and add to users watch list
				data.episodes.map(episode => {
					addEpisode(seriesId, episode);
				});
			})
			.then(function () {
				//get the episodes
				getEpisodes(seriesId);
			})
			.catch(function (error) {
				console.log("Error: ", error);
			})
			.finally(function () {
				setIsLoading(false);
            })
	};
	const getEpisodes = async (seriesID) => {
		setIsLoading(true);
		await fetch(host + '/api/episodes/' + seriesID + '/' + token.userId, {
			method: "get",
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token.token
			}
		})
			.then(function (response) {
				if (response.ok) {
					return response.json()
				}
				throw new Error(response.statusText);
			})
			.then(function (data) {
				console.log(data);
				setEpisodeList(data);
			})
			.catch(function (error) {
				console.log("Error: ", error);
			})
			.finally(function () {
				setIsLoading(false);
			});
	};
	const getUsersWatchList = async (token, userId) => {
		setIsLoading(true);
		await fetch(host + '/api/series/' + userId, {
			method: "get",
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token
			}
		})
			.then(function (response) {
				if (response.ok) {
					return response.json();
				}
				throw new Error(response.statusText);
			})
			.then(function (data) {
				setWatchList(data);
			})
			.catch(function (error) {
				console.log("Error: ", error);
			})
			.finally(function () {
				setIsLoading(false);
			});
	};

	//Remove from watch list
	const removeSeries = async (seriesId) => {
		setIsLoading(true);
		await fetch(host + '/api/series/' + token.userId + '/' + seriesId, {
			method: "delete",
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token.token
			}
		})
			.then(function (response) {
				if (response.ok) {
					getUsersWatchList(token.token, token.userId);
				}
				throw new Error(response.statusText);
			})
			.catch(function (error) {
				console.log("Error: ", error);
			})
			.finally(function () {
				setIsLoading(false);
            })
	}

	//Set whether an episode has been watched
	const watchedEpisode = async (episode) => {
		await fetch(host + '/api/watchedepisode/', {
			method: "post",
			headers: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token.token
			},
			body: '{ "EpisodeID":"' + episode.episodeID + '","SeriesID": "' + episode.seriesID + '","UserID": "' + token.userId + '","EpisodeTitle": "' + episode.episodeTitle + '","SeasonNumber": ' + episode.seasonNumber + ',"EpisodeImage": "' + episode.episodeImage + '","EpisodeNumber": ' + episode.episodeNumber + ',"Watched":true}'
		})
			.then(function (response) {
				if (response.ok) {
					getEpisodes(episode.seriesID);
				}
				throw new Error(response.statusText);
			})
			.catch(function (error) {
				console.log("Error: ", error);
			});
	};

	//Get next season
	const getNextSeason = async (seriesId, seasonNumber) => {
		await getSeasonEpisodes(seriesId, seasonNumber);
	}

	//If token not set yet, then show login/register page
    if (token.length == 0 || token.token == '') {
		return (
			<>
				<Loading isLoading={isLoading} />
				<Login loginSubmit={loginSubmit}/>
				<div className="separator"></div>
					<Register register={register} />
			</>
        );
    }

    return (
		<>
			<Loading isLoading={isLoading}/>
			<div className='container-fluid'>
				<div className='row'>
					<h2>Search IMDB</h2>
					<Search searchValue={searchValue} setSearchValue={setSearchValue} search={search} />

					<SeriesList seriesList={seriesList} addToWatchList={addToWatchList} />
				</div>
				<div className='row'>
					<WatchList watchList={watchList} getEpisodes={getEpisodes} removeSeries={removeSeries} />
				</div>
				<div className='row'>
					<EpisodeList episodeList={episodeList} watchedEpisode={watchedEpisode} getNextSeason={getNextSeason} />
				</div>
			</div>
		</>
    );
}
export default App
