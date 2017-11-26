/**
 * A basic Actor for the Simulation.
 * @version Basic
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
 * Performing an action, like picking up or placing an item, takes one move.
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

    // for testing
    window.actors.push(this);
  }

  /**
   * Returns the elements at the edge of the Actor.
   * @return {Array} The elements at each edge.
   */
  _getSurroundings() {
    // FIXME will probably crash if we check invalid indices (e.g. [-1])
    let actorRow = this.position[0];
    let actorColumn = this.position[1];
    // The elements on each of the four edges
    let edges = [
      this.simulation.area[actorRow - 1][actorColumn], // North
      this.simulation.area[actorRow][actorColumn + 1], // East
      this.simulation.area[actorRow + 1][actorColumn], // South
      this.simulation.area[actorRow][actorColumn - 1], // West
    ];
    return edges;
  }

  /**
   * Returns the current row and column of this Actor
   * @return {Array} The actor's row and column
   */
  getPosition() {
    return this.position;
  }

  /**
   * Moves one position in the specified direction, if allowed.
   * @param {String} direction The direction to move in | N,E,S,W
   */
  move(direction) {
    let edges = this._getSurroundings();
    switch (direction) {
      case 'N':
        if (this.simulation.config.groundElements.includes(edges[0])) {
          let north = [this.position[0] - 1, this.position[1]];
          this.simulation.swapElements(this.position, north);
          this.position = north;
        } else {
          throw new Error('Tried to move into a: ' + edges[0]);
        }
        break;
      case 'E':
        if (this.simulation.config.groundElements.includes(edges[1])) {
          let east = [this.position[0], this.position[1] + 1];
          this.simulation.swapElements(this.position, east);
          this.position = east;
        } else {
          throw new Error('Tried to move into a: ' + edges[1]);
        }
        break;
      case 'S':
        if (this.simulation.config.groundElements.includes(edges[2])) {
          let south = [this.position[0] + 1, this.position[1]];
          this.simulation.swapElements(this.position, south);
          this.position = south;
        } else {
          throw new Error('Tried to move into a: ' + edges[2]);
        }
        break;
      case 'W':
        if (this.simulation.config.groundElements.includes(edges[3])) {
          let west = [this.position[0], this.position[1] - 1];
          this.simulation.swapElements(this.position, west);
          this.position = west;
        } else {
          throw new Error('Tried to move into a: ' + edges[3]);
        }
        break;
    }
  }

  /**
   * Picks up the specified item if it is next to one
   * @param {String} item An item element
   */
  takeItem(item) {
    //TODO add a this.rules parameter to the contructor
    if (this.simulation.config.itemElements.includes(item)) {
      let edges = this._getSurroundings();
      if (edges.includes(item)) {
        this.item = item;
      } else {
        throw new Error(this.identifier + 'tried to take an item ' + item + ' that it was not next to');
      }
    } else {
      throw new Error(this.identifier + 'tried to take an unspecified item ' + item);
    }
  }

  /**
   * Places the currently held item in the position
   * @param {Array} position The position to place the item in
   */
  placeItem(position) {
    if (this.item !== undefined) {
      this.simulation.replaceElement(position, this.item);
    } else {
      throw new Error(this.identifier + ' tried to place an item while it was not holding one');
    }
  }

}