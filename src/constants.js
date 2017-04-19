module.exports = {
    /**
     * Constants denoting the directions.
     *
     * The values appointed to these directions is important, they are chosen
     * so that rotation can be done in a single expression as such:
     * moving clockwise: (dir + 1) % 4
     * moving counterclockwise: (4 + dir - 1) % 4
     *
     * Please maintain this property since it's crucial.
    */
    POINTING_UP: 0,
    POINTING_RIGHT: 1,
    POINTING_DOWN: 2,
    POINTING_LEFT: 3,



    /**
     * Constants denotiong horizontal or vertical directions.
     *
     * The values appointed to these directions is important, they are chosen so
     * that the pointing direction modulo 2 would give the general direction, i.e.
     * vertical or horizontal. For example: POINTING_UP % 2 == VERTICAL, etc...
     *
     * Please maintain this property since it's crucial.
    */
    HORIZONTAL: 1,
    VERTICAL: 0
};
