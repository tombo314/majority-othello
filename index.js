/*
sessionStorage で管理する変数

isHost : 自分が部屋を立てたかどうか
username : 自分のユーザー名
roomName : 自分が入っている部屋の名前
samePageLoaded : 同じページを一度読み込んだかどうか
*/

let http = require("http");
let fs = require("fs");
let socket = require("socket.io");
let server = http.createServer((req, res)=>{
    // main
    if (req.url=="/"){
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(fs.readFileSync("main/index.html"));
    } else if (req.url=="/main/main.css"){
        res.writeHead(200, {"Content-Type": "text/css"});
        res.end(fs.readFileSync("main/main.css"));
    } else if (req.url=="/main/main.css.map"){
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(fs.readFileSync("main/main.css.map"));
    } else if (req.url=="/main/main.js"){
        res.writeHead(200, {"Content-Type": "application/javascript"});
        res.end(fs.readFileSync("main/main.js"));
    }
    // wait
    else if(req.url=="/wait"){
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(fs.readFileSync("wait/wait.html"));
    } else if(req.url=="/wait/wait.css"){
        res.writeHead(200, {"Content-Type": "text/css"});
        res.end(fs.readFileSync("wait/wait.css"));
    } else if (req.url=="/wait/wait.css.map"){
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(fs.readFileSync("wait/wait.css.map"));
    } else if(req.url=="/wait/wait.js"){
        res.writeHead(200, {"Content-Type": "application/javascript"});
        res.end(fs.readFileSync("wait/wait.js"));
    }
    // battle
    else if (req.url=="/battle"){
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(fs.readFileSync("battle/battle.html"));
    } else if(req.url=="/battle/battle.css"){
        res.writeHead(200, {"Content-Type": "text/css"});
        res.end(fs.readFileSync("battle/battle.css"));
    } else if (req.url=="/battle/battle.css.map"){
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(fs.readFileSync("battle/battle.css.map"));
    } else if(req.url=="/battle/battle.js"){
        res.writeHead(200, {"Content-Type": "application/javascript"});
        res.end(fs.readFileSync("battle/battle.js"));
    }
    // pictures
    else if (req.url=="/pictures/othello_field.png"){
        res.writeHead(200, {"Content-Type": "img/png"});
        res.end(fs.readFileSync("pictures/othello_field.png"));
    }
    else if (req.url=="/favicon.ico"){
        res.end();
    }
}).listen(process.env.PORT || 8000);
let io = socket(server);

/*
rooms = {
    // 部屋名をキーとする、部屋ごとの連想配列
    roomName: {
        "users": [username, username, ...],
        "cntUsers": 0,
        "cntRed": 0,
        "cntBlue": 0,
        "cntTmp": 0,
        "voted": [[0]*8 for _ in range(8)]
    },
    ...
}
users = {
    // 各ユーザーのユーザー名をキーとする、ユーザー単位の連想配列
    username: {
        "ownX": ownX,
        "ownY": ownY,
        "color": "red",
    },
    ...
}
*/
let rooms = {};
let users = {};
let color;
io.on("connection", (socket)=>{
    /* index.html */
    // 前回作った部屋と前回のユーザー情報を削除する
    socket.on("delete-user", (data)=>{
        let username = data.value["username"];
        let roomName = data.value["roomName"];
        delete rooms[roomName];
        delete users[username];
    });
    // users を返す
    socket.on("need-users", ()=>{
        io.sockets.emit("need-users", {value: users});
    });
    // rooms に部屋の情報を登録する
    socket.on("room-make-finished", (data)=>{
        let roomInfo = data.value;
        let roomName = roomInfo["roomName"];
        let roomUsername = roomInfo["roomUsername"];
        let voted = [];
        // voted 配列を初期化
        for (let i=0; i<8; i++){
            let tmp = [];
            for (let j=0; j<8; j++){
                tmp.push(0);
            }
            voted.push(tmp);
        }
        // rooms 連想配列を初期化
        rooms[roomName] = {
            "users": [roomUsername],
            "cntUsers": 0,
            "cntRed": 0,
            "cntBlue": 0,
            "cntTmp": 0,
            "voted": voted
        };
        users[roomUsername] = {};
        io.sockets.emit("update-rooms", {value: rooms});
    });
    // 対応する部屋の users にゲストを登録する
    socket.on("register-name", (data)=>{
        let username = data.value["username"];
        let roomName = data.value["roomName"];
        if (Object.keys(rooms).includes(roomName)){
            rooms[roomName]["users"].push(username);
            users[username] = {};
        } else {
            // 部屋が存在しない場合はスタート画面に戻る
            io.sockets.emit(username, {value: false});
        }
    });

    /* wait.html */
    // マッチングが完了した部屋の名前を通知する
    socket.on("waiting-finished", (data)=>{
        io.sockets.emit("waiting-finished", {value: rooms[data.value]["users"]});
    });

    /* battle.html */
    // 全ユーザーの情報を、対応する部屋に返す
    socket.on("user-info-init", (data)=>{
        let userInfo = data.value;
        if (userInfo!=null){
            let username = userInfo["username"];
            let roomName = userInfo["roomName"];
            let userX = userInfo["userX"];
            let userY = userInfo["userY"];
            let cntRed;
            let cntBlue;
            // 部屋が見つかった場合
            if (Object.keys(rooms).includes(roomName)){
                cntRed = rooms[roomName]["cntRed"];
                cntBlue = rooms[roomName]["cntBlue"];
                rooms[roomName]["cntUsers"]++;
                if (cntRed<=cntBlue){
                    color = "red";
                    rooms[roomName]["cntRed"]++;
                } else {
                    color = "blue";
                    rooms[roomName]["cntBlue"]++;
                }
                users[username] = {
                    "userX": userX,
                    "userY": userY,
                    "color": color
                };
                // 部屋とユーザーの情報を返す
                if (rooms[roomName]["cntUsers"]>=rooms[roomName]["users"].length){
                    io.sockets.emit("user-info-init", {value: {
                        "rooms": rooms,
                        "users": users
                    }});
                }
            }
            // 部屋が見つからない場合はスタート画面に戻る
            else {
                io.sockets.emit(username, {value: false});
            }
        }
    });
    // プレイヤーの位置が変わったことを通知する
    socket.on("coordinates-changed", (data)=>{
        io.sockets.emit("coordinates-changed", {value:data.value});
    });
    // オセロの盤面が変わったことを通知する
    socket.on("field-changed", (data)=>{
        io.sockets.emit("field-changed", {value:data.value});
    });
    // 「赤（青）のターン」の、赤（青）の文字の色が変わったことを通知する
    socket.on("text-color-changed", (data)=>{
        io.sockets.emit("text-color-changed", {value:data.value});
    });
    // 工事中
    // 投票を受け付ける
    socket.on("voted", (data)=>{
        let i = data.value[0];
        let j = data.value[1];
        let oneOrTwo = data.value[2];
        // 投票する
        rooms[roomName]["voted"][i][j]++;
        let color = oneOrTwo==1 ? "cntRed" : "cntBlue";
        let roomName = data.value[3];
        let timeout = data.value[4];
        // TURN_DURATION_SEC を超えたら、強制的にターンを終了する
        if (timeout){
            rooms[roomName]["cntTmp"] = 9999;
        }
        // 投票結果を返す
        // -> ０票の場合は置ける場所からランダムに
        if (rooms[roomName]["cntTmp"]>=rooms[roomName][color]){
            let h = 0;
            let w = 0;
            let max = 0;
            for (let i=0; i<8; i++){
                for (let j=0; j<8; j++){
                    if (max<rooms[roomName]["voted"][i][j]){
                        max = rooms[roomName]["voted"][i][j];
                        h = i;
                        w = j;
                    }
                }
            }
            io.sockets.emit("voted", {value: [h, w, oneOrTwo, roomName]});
        }
    });
    // ゲームが終了したことを通知する
    socket.on("game-finished", (data)=>{
        io.sockets.emit("game-finished", {value:data.value});
    });
    // 公開されている部屋を更新する
    socket.on("update-rooms", (data)=>{
        io.sockets.emit("update-rooms", {value: rooms});
    });
    // rooms を返す
    socket.on("need-rooms", (data)=>{
        io.sockets.emit("need-rooms", {value: rooms});
    });
});

/* 
To Do
全体
・BGM と SE を入れる

main
・design の丸が画面端から出てこない
・form タグを使って getElementById().onclick から name.onclick に変更する
-> 授業が終わったら getElementById().onclick に戻す

battle
・投票システムを作る
・もう一度最初からデータの流れをたどって確認する
-> socket の text-color-changed と field-changed を voted に統合する
・１ターンの秒数が過ぎたら強制的に拠点に戻して、相手のターンにする
・順番に石がひっくり返るようにする（rotate でアニメーションも作れそう）
・２人以上いないとバトル画面に遷移できないようにする
・部屋間で独立した情報を扱うときは、roomName をソケット通信に乗せなければならない
・部屋ごとに cntTmp をインクリメントしながら、投票が終わったか確認する。
-> TURN_DURATION_SEC(秒) 経過したら強制的に投票を締め切る

// 工事中　<-を参照
*/

/*
投票の流れ

// 投票する
このタイミングで isRed && color=="red" || !isRed && color=="blue" に当てはまらない人は操作できない
if (e.key=="Enter"){
    if (isRed){
        vote(paintedI, paintedJ, RED);
        isRed = false;
    } else {
        vote(paintedI, paintedJ, BLUE);
        isRed = true;
    }
}

let vote=(i, j, oneOrTwo)=>{
    if (CanPutStoneThere(i, j, oneOrTwo)){
        socket.emit("voted", {value: ""});
        // 工事中
        if (isRed && color=="red" || !isRed && color=="blue"){
            x = 0;
            y = 0;
            own.style.transform = `translate(${x}px, ${y}px)`;
            ownName.style.transform = `translate(${ownX+x+xDiff}px, ${ownY+y+INIT_Y_DIFF}px)`;
            keysValid = false;
        } else {
            keysValid = true;
        }
    }
}

// 投票を受け付ける
socket.on("voted", (data)=>{
    color = "";
    // 投票結果を返す
    voted 配列を初期化する
    // -> ０票の場合は置ける場所からランダムに
    if (false){
        let h = 0;
        let w = 0;
        let max = 0;
        for (let i=0; i<8; i++){
            for (let j=0; j<8; j++){
                if (max<voted[i][j]){
                    max = voted[i][j];
                    h = i;
                    w = j;
                }
            }
        }
        io.sockets.emit("voted", {value: [i, j, color]});
    }
});

// 投票結果を受け取る
socket.on("voted", (data)=>{
    let i = data.value[0];
    let j = data.value[1];
    let color = data.value[2]; // 1:RED, 2:BLUE
    let otherColor;
    if (color==RED){
        otherColor = BLUE;
    } else {
        otherColor = RED;
    }
    let valid;
    valid = othello(i, j, color);
    if (valid){
        cntStone += 1;
        if (cntStone>=STONE_LIMIT){
            finished = true;
        }
        if (CanPutStoneAll(color)){
            isRed = false;
        } else if (!CanPutStoneAll(otherColor)){
            finished = true;
        }
        // socket.emit("field-changed", {value:[username, i, j, color, isRed]});
    }
    if (valid){
        let turn = document.getElementById("turn");
        let turnColor;
        if (color==RED){
            turn.innerHTML = "<span id='turn-color'>赤</span>のターン";
            turnColor = document.getElementById("turn-color");
            turnColor.style.color = COLOR_FIELD_RED;
            // socket.emit("text-color-changed", {value: [username, "<span id='turn-color'>赤</span>のターン", COLOR_FIELD_RED]});
        } else if (color==BLUE) {
            turn.innerHTML = "<span id='turn-color'>青</span>のターン";
            turnColor = document.getElementById("turn-color");
            turnColor.style.color = COLOR_FIELD_BLUE;
            // socket.emit("text-color-changed", {value: [username, "<span id='turn-color'>青</span>のターン", COLOR_FIELD_BLUE]});
        }
    }
});

*/