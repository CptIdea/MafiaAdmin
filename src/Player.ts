export class Player {
    public name: string
    public role: string
    public live: boolean
    public dis: boolean
    public foul:number

    constructor(num) {
        this.name = "Player "+num
        this.live = true
        this.role = ""
        this.foul = 0
    }

    public kill(){
        this.live = !this.live
    }
}
