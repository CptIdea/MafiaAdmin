const app = new Vue({
    el: '#app',
    data: {
        title: 'Mafia App',
        mode: -1,
        socket: null,
        players: [],
        vote: [],
        control: {
            selected: 0,
            timer: 0,
        },
        gameStep: 0,
        speaker: 0,
        startSpeaker:0,
        ruDict:{
            'mafia':'Мафия',
            'don':'Дон',
            'sheriff':'Комиссар',
            true:'Да',
            false:'Нет'
        },
    },
    methods: {
        setMafia(event){
          this.socket.emit('setMafia',{'player':event.target.value})
        },
        setDon(event){
            this.socket.emit('setDon',{'player':event.target.value})
        },
        setSheriff(event){
            this.socket.emit('setSheriff',{'player':event.target.value})
        },
        modeSelect(event) {
            if (event.target.id === "mode1") {
                this.mode = 1
            }
            if (event.target.id === "mode2") {
                this.mode = 2
            }
            if (event.target.id === "title") {
                this.mode = -1
            }
            if (event.target.id === "settings"){
                this.mode = 0
            }
        },
        receivedMessage(message) {
            if (message.type == "players") {
                this.players = message.players
            }
        },
        playerAdd() {
            console.log("addPlayer")
            this.socket.emit('addPlayer')
        },
        selectPlayer(event) {
            this.control.selected = event.originalTarget.id
        },
        doAction(event) {
            this.socket.emit('playerAction', {"player": this.control.selected, "playerAction": event.target.id})
        },
        timerMinute() {
            this.socket.emit('timer', {'time': 60})
        },
        timerHalfMinute() {
            this.socket.emit('timer', {'time': 30})
        },
        nextSpeech() {
            this.socket.emit('nextSpeech')
        },
        changeSpeech() {
            this.socket.emit('changeSpeech', {'player': this.control.selected})
        },
        nextCircle(){
            this.socket.emit('nextCircle')
        },
        giveFoul() {
            this.socket.emit('foul', {'player': this.control.selected})
        },
        refundFoul(){
            this.socket.emit('antifoul', {'player': this.control.selected})
        },
        ban(){
            this.giveFoul()
            this.giveFoul()
            this.giveFoul()
            this.giveFoul()
        }




    },
    created() {
        this.socket = io('http://localhost:3000')
        this.socket.on('msgToClient', (message) => {
            console.log(message)
            this.receivedMessage(message)
        })
        this.socket.on('players', (message) => {
            this.players = message.players
        })
        this.socket.on('timer', (message) => {
            this.control.timer = message.timer
        })
        this.socket.on('vote', (message) => {
            this.vote = message.vote
        })
        this.socket.on('speech', (message) => {
            this.speaker = message.speaker
        })
        this.socket.on('startSpeaker',(message)=>{
            this.startSpeaker = message.speaker
        })

    }
})

