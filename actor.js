/**
 * A basic Actor for the Simulation.
 * @version 2017-11-22
 * @author NJRBailey
 * 
 * Actors want to pick up blocks, place the block, and repeat until done, without:
 *  - Colliding with another Actor or block
 *  - Making the same section as another Actor
 *  - Barring off a section from being made (e.g. by surrounding an empty objective point with blocks) 
 * 
 * One way would be to have the bots constantly trading locations
 * I think a better way would be to use a path-finding algorithm (e.g. A*) to determine a path for each Actor to the next objective,
 * which is shared out to the other Actors, and update it if three conditions are met:
 *  1) The paths cross the same point for multiple Actors
 *  2) The paths will cross after the same number of moves (tiles traversed)
 *  3) The priority for this Actor is less than for the other Actor
 * This point will then need to be temporarily blacklisted for that actor, until the next objective is completed
 * For this version of the Actor there are no chokepoints, so the Actors can be constantly moving.
 */
export class Actor {
  /**
   * Create a new basic Actor
   * @param {String}     identifier The unique identifier for this Actor 
   * @param {Integer}    priority   The priority to use in path disputes - lower value means higher importance
   * @param {Array}      position   The coordinates of the starting position
   * @param {Simulation} simulation The Simulation to broadcast position, route, objective point to 
   */
  constructor(identifier, priority, position, simulation) {
    this.identifier = identifier;
    this.priority = priority;
    this.simulation = simulation;
    // Whether the Actor should be performing tasks
    this.active = true;
    // Whether the Actor is carrying an item
    this._item = undefined;
    // The position of the Actor
    this.position = position;
  }

  /**
   * Returns true if the Actor is next to the element
   * @param {String} element The element that we are looking for 
   */
  _isNextTo(element) {
    // FIXME will probably crash if we check invalid indices (e.g. [-1])
    // TODO the x and y may be the wrong way round
    let actorX = this.position[0];
    let actorY = this.position[1];
    // The elements on each of the four edges
    let edges = [
      this.simulation.area[actorX][actorY - 1], // North
      this.simulation.area[actorX + 1][actorY], // East
      this.simulation.area[actorX][actorY + 1], // South
      this.simulation.area[actorX - 1][actorY], // West
    ];

    for (let edge of edges) {
      if (edge === element) {
        return true;
      }
    }
    return false;
  }


}