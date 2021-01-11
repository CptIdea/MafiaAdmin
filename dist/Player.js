"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
class Player {
    constructor(num) {
        this.name = "Player " + num;
        this.live = true;
        this.role = "";
        this.foul = 0;
    }
    kill() {
        this.live = !this.live;
    }
}
exports.Player = Player;
//# sourceMappingURL=Player.js.map