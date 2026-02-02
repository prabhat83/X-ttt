

// ----	--------------------------------------------	--------------------------------------------	
// ----	--------------------------------------------	--------------------------------------------	

function emit_lobby_status() {
	players_avail.forEach(function (p) {
		var playerList = players_avail
			.filter(function (player) { return player.sockid !== p.sockid })
			.map(function (player) {
				return {
					sockid: player.sockid,
					name: player.name,
					uid: player.uid,
					status: player.status
				}
			});

		io.to(p.sockid).emit("lobby_waiting", {
			waiting: true,
			queue_size: players_avail.length,
			players: playerList
		});
	});
}

// New player has joined
function onNewPlayer(data) {

	util.log("New player has joined: " + data.name);

	// Create a new player
	var newPlayer = new Player(-1, data.name, "looking");
	newPlayer.sockid = this.id;

	this.player = newPlayer;

	// Add new player to the players array
	players.push(newPlayer);
	players_avail.push(newPlayer);

	util.log("looking for pair - uid:" + newPlayer.uid + " (" + newPlayer.name + ")");

	// pair_avail_players();
	emit_lobby_status();

	// updAdmin("looking for pair - uid:"+p.uid + " ("+p.name + ")");

	// updAdmin("new player connected - uid:"+data.uid + " - "+data.name);

};

// ----	--------------------------------------------	--------------------------------------------	

// function pair_avail_players() {

// 	if (players_avail.length < 2)
// 		return;


// 	var p1 = players_avail.shift();
// 	var p2 = players_avail.shift();

// 	p1.mode = 'm';
// 	p2.mode = 's';
// 	p1.status = 'paired';
// 	p2.status = 'paired';
// 	p1.opp = p2;
// 	p2.opp = p1;

// 	//util.log("connect_new_players p1: "+util.inspect(p1, { showHidden: true, depth: 3, colors: true }));

// 	// io.sockets.connected[p1.sockid].emit("pair_players", {opp: {name:p2.name, uid:p2.uid}, mode:'m'});
// 	// io.sockets.connected[p2.sockid].emit("pair_players", {opp: {name:p1.name, uid:p1.uid}, mode:'s'});
// 	io.to(p1.sockid).emit("pair_players", { opp: { name: p2.name, uid: p2.uid }, mode: 'm' });
// 	io.to(p2.sockid).emit("pair_players", { opp: { name: p1.name, uid: p1.uid }, mode: 's' });

// 	util.log("connect_new_players - uidM:" + p1.uid + " (" + p1.name + ")  ++  uidS: " + p2.uid + " (" + p2.name + ")");
// 	// updAdmin("connect_new_players - uidM:"+p1.uid + " ("+p1.name + ")  ++  uidS: "+p2.uid + " ("+p2.name+")");

// 	// Everytime players are paired, update lobby status
// 	emit_lobby_status();
// };

// ----	--------------------------------------------	--------------------------------------------	

function onTurn(data) {
	//util.log("onGameLoadedS with qgid: "+data.qgid);

	io.to(this.player.opp.sockid).emit("opp_turn", { cell_id: data.cell_id });

	util.log("turn  --  usr:" + this.player.mode + " - :" + this.player.name + "  --  cell_id:" + data.cell_id);
	// updAdmin("Q answer - game - qgid:"+data.qgid + "  --  usr:"+this.player.mode + " - uid:"+this.player.uid + "  --  qnum:"+data.qnum + "  --  ans:"+data.ansnum);
};

// ----	--------------------------------------------	--------------------------------------------	

function onInvitePlayer(data) {
	if (!this.player || !data.target_sockid)
		return;

	var inviter = this.player;
	var targetPlayer = players_avail.find(function (p) { return p.sockid === data.target_sockid });

	console.log('onInvitePlayer', inviter.name, targetPlayer ? targetPlayer.name : 'target not found');
	if (!targetPlayer) {
		io.to(inviter.sockid).emit("invite_error", { message: "Player not found" });
		return;
	}

	inviter.pending_invite = targetPlayer;

	util.log("Invite sent from " + inviter.name + " to " + targetPlayer.name);

	io.to(targetPlayer.sockid).emit("invite_received", {
		from: inviter.name,
		from_sockid: inviter.sockid
	});
}

// ----	--------------------------------------------	--------------------------------------------	

function onAcceptInvite(data) {
	if (!this.player || !data.from_sockid)
		return;

	var acceptor = this.player;
	var inviter = players.find(function (p) { return p.sockid === data.from_sockid });

	console.log('onAcceptInvite', acceptor.name, inviter ? inviter.name : 'inviter not found');
	if (!inviter || !inviter.pending_invite || inviter.pending_invite.sockid !== acceptor.sockid) {
		io.to(acceptor.sockid).emit("invite_error", { message: "Invalid invite" });
		return;
	}

	// Pair them
	inviter.mode = 'm';
	acceptor.mode = 's';
	inviter.status = 'paired';
	acceptor.status = 'paired';
	inviter.opp = acceptor;
	acceptor.opp = inviter;
	inviter.pending_invite = null;

	util.log("Players paired: " + inviter.name + " vs " + acceptor.name);

	io.to(inviter.sockid).emit("pair_players", { opp: { name: acceptor.name, uid: acceptor.uid }, mode: 'm' });
	io.to(acceptor.sockid).emit("pair_players", { opp: { name: inviter.name, uid: inviter.uid }, mode: 's' });

	emit_lobby_status();
}

function onResetPairing() {
	if (!this.player)
		return;

	var player = this.player;
	if (player.status !== 'paired' || !player.opp)
		return;

	var oppPlayer = player.opp;

	// Reset both players
	player.mode = null;
	player.status = 'looking';
	player.opp = null;
	player.pending_invite = null;

	oppPlayer.mode = null;
	oppPlayer.status = 'looking';
	oppPlayer.opp = null;
	oppPlayer.pending_invite = null;

	// Add both back to available players
	if (players_avail.indexOf(player) === -1)
		players_avail.push(player);
	if (players_avail.indexOf(oppPlayer) === -1)
		players_avail.push(oppPlayer);

	util.log("Pairing reset for players: " + player.name + " and " + oppPlayer.name);

	emit_lobby_status();
}

// ----	--------------------------------------------	--------------------------------------------	
// ----	--------------------------------------------	--------------------------------------------	

// Socket client has disconnected
function onClientDisconnect() {
	// util.log("onClientDisconnect: "+this.id);

	if (!this.player)
		return;

	var removePlayer = this.player;
	var playerIdx = players.indexOf(removePlayer);
	if (playerIdx !== -1)
		players.splice(playerIdx, 1);

	var availIdx = players_avail.indexOf(removePlayer);
	if (availIdx !== -1)
		players_avail.splice(availIdx, 1);

	if (removePlayer.status === 'paired' && removePlayer.opp) {
		var oppPlayer = removePlayer.opp;

		// Reset opponent player
		oppPlayer.mode = null;
		oppPlayer.status = 'looking';
		oppPlayer.opp = null;
		oppPlayer.pending_invite = null;

		// Update opponent in the available players
		const oppIndex = players_avail.indexOf(oppPlayer);
		if (oppIndex !== -1) {
			players_avail[oppIndex] = oppPlayer;
			io.to(oppPlayer.sockid).emit("invite_error", { message: "Other player disconnected." });
		}
	}

	emit_lobby_status();


	if (this.status == "admin") {
		util.log("Admin has disconnected: " + this.uid);
		//		updAdmin("Admin has disconnected - uid:"+this.uid + "  --  "+this.name);
	} else {
		util.log("Player has disconnected: " + this.id);
		//		updAdmin("player disconnected - uid:"+removePlayer.uid + "  --  "+removePlayer.name);
	}

};

// ----	--------------------------------------------	--------------------------------------------	
// ----	--------------------------------------------	--------------------------------------------	

// ----	--------------------------------------------	--------------------------------------------	
// ----	--------------------------------------------	--------------------------------------------	

set_game_sock_handlers = function (socket) {

	// util.log("New game player has connected: "+socket.id);

	socket.on("new player", onNewPlayer);

	socket.on("invite_player", onInvitePlayer);

	socket.on("accept_invite", onAcceptInvite);

	socket.on("reset_pairing", onResetPairing);

	socket.on("ply_turn", onTurn);

	socket.on("disconnect", onClientDisconnect);

};
