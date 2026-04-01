const cols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
// DK6 sheet
// let sheet = {
// 	id: "",
// 	tracks: {
// 		gid: 0,
// 		startRow: 2,
// 		diffCol: cols.indexOf("B"),
// 		idCol: cols.indexOf("C"),
// 	},
// 	overrides: {
// 		gid: 739603910,
// 		startRow: 2,
// 		userCol: cols.indexOf("A"),
// 		trackCol: cols.indexOf("B"),
// 		timeCol: cols.indexOf("C"),
// 	},
// }

// DK5 sheet
let sheet = {
	id: "1PTKZi8UZHOy_lyItFzUrrc2XZ3o-TNQsj7jhuxU8k2U",
	tracks: {
		gid: 0,
		startRow: 2,
		idCol: cols.indexOf("B"),
	},
}

let dashcraftKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OWJiMzc3OWIzMDhjMWRjMjZhMTQ5ZDQiLCJpbnRlbnQiOiJvQXV0aCIsImlhdCI6MTc3Mzg3NzExM30.5cmyo7mKCeFn2IoZVoZwAdIRb76Rfvuu4-7CZyhG8_E"


function show(button, section) {
	document.querySelectorAll("#header #navbar button").forEach((button) => {
		button.classList.remove("active");
	});
	button.classList.add("active");
	let tracks = document.querySelector("#trackContainer");
	let lb = document.querySelector("#lbContainer");
	let lbtable = document.querySelector("#leaderboard");
	let profile = document.querySelector("#profileContainer");
	trackContainer.hidden = false;
	if (section == "leaderboard") {
		lb.hidden = false;
		profile.hidden = true;
		lbtable.hidden = false;
		profile.appendChild(tracks);
		document.querySelector(".sort .options .pos").classList.remove("inactive");
	} else if (section == "tracks") {
		lb.hidden = true;
		document.body.appendChild(tracks);
		document.querySelector(".sort .options .pos").classList.add("inactive");
		if (sortMode.mode == "pos") {
			changeSort(document.querySelector(".sort .options button:first-child"), "pos");
		}
	}

}

let sortMode = {mode: "num", order: "asc"}
function toggleSort() {
	const toggle = document.querySelector("#trackContainer .sort .toggle");
	sortMode.order = (sortMode.order == "asc") ? "desc" : "asc";
	toggle.classList.toggle("desc", sortMode.order == "desc");
	addTracks();
}
function changeSort(button) {
	document.querySelectorAll("#trackContainer .sort .options button").forEach((button) => {
		button.classList.remove("active");
	});
	let mode = button.className;
	button.classList.add("active");
	if (sortMode.mode == mode) {
		return;
	}
	sortMode.mode = mode;
	addTracks();
}


async function getSheetData() {
	let difficulties = fetch(`https://docs.google.com/spreadsheets/d/${sheet.id}/gviz/tq?tqx=out:json&tq&gid=${sheet.tracks.gid}`)
		.then((response) => response.text())
		.then((text) => {
			let json = JSON.parse(text.substring(47, text.length - 2)).table;
			let startRow = sheet.tracks.startRow - json.parsedNumHeaders - 1;
			let difficulty;
			if (sheet.tracks.diffCol) {
				difficulty = ["white", "green", "blue", "red", "black"].indexOf(row.c[sheet.tracks.diffCol].v.toLowerCase());
			} else {
				difficulty = "white";
				document.querySelector(".sort .options .diff").classList.add("inactive");
			}
			let data = json.rows.slice(startRow).map((row) => [row.c[sheet.tracks.idCol].v.slice(-24), difficulty]);
			data = Object.fromEntries(data);
			console.log(data);
			return data;
			
		});
	let overrides;
	if (sheet.overrides) {
		overrides = fetch(`https://docs.google.com/spreadsheets/d/${sheet.id}/gviz/tq?tqx=out:json&tq&gid=${sheet.overrides.gid}`)
			.then((response) => response.text())
			.then((text) => {
				json = JSON.parse(text.substring(47, text.length - 2)).table;
				let startRow = sheet.overrides.startRow - json.parsedNumHeaders - 1;
				let data = json.rows.slice(startRow).map((row) => {
					return {
						user: row.c[sheet.overrides.userCol].v.slice(-24),
						track: parseInt(row.c[sheet.overrides.trackCol].v),
						time: parseFloat(row.c[sheet.overrides.timeCol].v),
					}
				});
				console.log(data);
				return data;
			});
	} else {
		overrides = new Promise((resolve) => {resolve([])});
	}
	[difficulties, overrides] = await Promise.all([difficulties, overrides]);
	let ids = Object.keys(difficulties);

	overrides = overrides.map((override) => {
		override.track = ids[override.track - 1];
		return override;
	});
	return [ids, difficulties, overrides];
}
async function getGameData(ids) {
	let fetches = [];
	for (let i = 0; i < ids.length; i++) {
		let id = ids[i];
		let image = new Image();
		image.src = `https://cdn.dashcraft.io/v2/prod/track-thumbnail/lg/${id}.jpg`;
		fetches.push(
			fetch(`https://api.dashcraft.io/trackv2/${id}`, {
				headers: {
					Authorization: dashcraftKey,
				}
			})
				.then((response) => response.json())
				.then((json => {
					json.image = image;
					json.number = i + 1;
					return [id, json];
				}))
		)
	}
	const tracks = await Promise.all(fetches);
	return Object.fromEntries(tracks);
}

let ids, tracks, userIds, users;
function addTracks() {
	// sort by number by default to make sure ordering is consistent
	ids.sort((a, b) => tracks[a].number - tracks[b].number)
	if (sortMode.mode == "mapper") {
		ids = ids.sort((a, b) => tracks[a].user.username.localeCompare(tracks[b].user.username));
	} else if (sortMode.mode == "fins") {
		ids = ids.sort((a, b) => tracks[a].leaderboardTotalCount - tracks[b].leaderboardTotalCount);
	} else if (sortMode.mode == "diff") {
		ids = ids.sort((a, b) => tracks[a].difficulty - tracks[b].difficulty);
	} else if (sortMode.mode == "pos") {
		ids = ids.sort((a, b) => (user.finishes[a] || { pos: Infinity }).pos - (user.finishes[b] || { pos: Infinity }).pos);
	}
	if (sortMode.order == "desc") {
		ids.reverse();
	}

	const trackList = document.querySelector("#trackContainer .list");
	trackList.innerHTML = "";
	const colors = ["#efefef", "#6aa84f", "#3c78d8", "#e06666", "#434343"];
	for (let id of ids) {
		let track = tracks[id];
		let trackDiv = document.createElement("button");
		trackDiv.className = "track";
		trackDiv.onclick = () => window.open(`https://dashcraft.io/?t=${id}`);
		let thumbnailContainer = document.createElement("div");
		thumbnailContainer.className = "thumbnailContainer";
		thumbnailContainer.appendChild(track.image);
		trackDiv.appendChild(thumbnailContainer);
		let name = document.createElement("div");
		name.className = "name";
		name.textContent = `Dashiest Kacky #${track.number}`;
		name.style.color = colors[track.difficulty];
		trackDiv.appendChild(name);
		let mapper = document.createElement("div");
		mapper.className = "mapper";
		mapper.textContent = track.user.username;
		trackDiv.appendChild(mapper);
		let finishes = document.createElement("div");
		finishes.className = "finishes"
		finishes.textContent = track.leaderboardTotalCount;
		trackDiv.appendChild(finishes);
		if (user) {
			let pos = document.createElement("div");
			pos.className = "pos";
			pos.textContent = (user.finishes[id] || {pos: "N/A"}).pos;
			trackDiv.appendChild(pos);
		}
		trackList.appendChild(trackDiv);
	}
}

let user;
function displayProfile(userId) {
	user = users[userId];
	addTracks();
	document.querySelector("#profileContainer .header .pos").textContent = `#${user.pos}`;
	if (user.pos == 1) document.querySelector("#profileContainer .header .pos").style.color = "#ffd700";
	else if (user.pos == 2) document.querySelector("#profileContainer .header .pos").style.color = "#c0c0c0";
	else if (user.pos == 3) document.querySelector("#profileContainer .header .pos").style.color = "#cd7f32";
	else document.querySelector("#profileContainer .header .pos").style.color = "inherit";
	document.querySelector("#profileContainer .header .username").textContent = user.username;
	document.querySelector("#profileContainer .pos .value").textContent = user.averagePos.toFixed(2);
	document.querySelector("#profileContainer .fins .value").textContent = Object.keys(user.finishes).length;
	document.querySelector("#profileContainer .wrs .value").textContent = user.wrs;
	document.querySelector("#leaderboard").hidden = true;
	document.querySelector("#profileContainer").hidden = false;
}


async function main() {
	let overrides;
	[ids, difficulties, overrides] = await getSheetData();
	console.log(ids);
	console.log(difficulties);
	tracks = await getGameData(ids);

	for (let override of overrides) {
		// add override to leaderboard
		tracks[override.track].leaderboard.push({user: {_id: override.user}, time: override.time});
	}
	for (let id in tracks) {
		// sort leaderboard by time
		tracks[id].leaderboard.sort((a, b) => a.time - b.time);
		// remove duplicate entries, keeping the best time
		tracks[id].leaderboard = tracks[id].leaderboard.filter((entry, index) => tracks[id].leaderboard.slice(0, index).every((e) => e.user._id !== entry.user._id));
		// set difficulty
		tracks[id].difficulty = difficulties[id];
	}


	users = {};
	for (let id in tracks) {
		let track = tracks[id];
		for (let i = 0; i < track.leaderboard.length; i++) {
			let entry = track.leaderboard[i];
			// add new user if not added yet
			if (!users[entry.user._id]) {
				users[entry.user._id] = {finishes: {}};
			}
			// add finish to user
			users[entry.user._id].finishes[id] = {time: entry.time, pos: i + 1};
			// add username if exists
			if (entry.user.username) {
				users[entry.user._id].username = entry.user.username;
			}
		}
	}
	for (let id in users) {
		// calculate average position
		users[id].averagePos = Object.values(users[id].finishes).reduce((sum, finish) => sum + finish.pos, 0) / Object.keys(users[id].finishes).length;
		// calculate wrs
		users[id].wrs = Object.values(users[id].finishes).filter((finish) => finish.pos == 1).length;
		// use id as username if no username found
		if (!users[id].username) {
			users[id].username = id;
		}
	}
	// get array of users
	userIds = Object.keys(users);
	// sort users by number of finishes, then by average position
	userIds.sort((a, b) => (Object.keys(users[b].finishes).length - Object.keys(users[a].finishes).length) || (users[a].averagePos - users[b].averagePos));

	for (let i = 0; i < userIds.length; i++) {
		let id = userIds[i];
		users[id].pos = i + 1;
	}

	let table = document.querySelector("#leaderboard");
	for (let i = 0; i < userIds.length; i++) {
		let id = userIds[i];
		let user = users[id];
		let row = document.createElement("tr");
		row.onclick = () => displayProfile(id);
		let posCell = document.createElement("td");
		posCell.textContent = i + 1;
		row.appendChild(posCell);
		let playerCell = document.createElement("td");
		playerCell.textContent = user.username;
		row.appendChild(playerCell);
		let finishesCell = document.createElement("td");
		finishesCell.textContent = Object.keys(user.finishes).length;
		row.appendChild(finishesCell);
		let averagePosCell = document.createElement("td");
		averagePosCell.textContent = user.averagePos.toFixed(2);
		row.appendChild(averagePosCell);
		let wrCell = document.createElement("td");
		wrCell.textContent = user.wrs;
		row.appendChild(wrCell);
		table.appendChild(row);
	}


	addTracks();
	show(document.querySelector("#navbar :first-child"), "tracks")
}

main();
