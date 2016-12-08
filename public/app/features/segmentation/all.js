/**
 * Created by santosh on 11/25/16.
 */
define([
  './segments_ctrl',
  './playlist_srv',
  './playlist_edit_ctrl',
  './playlist_routes'
], function () {});



/*
*
* If we create segments separately then db will have rows equal to number of segments.
* If segments are created as a part of segment board then most of the segments will be segregated but
*    then we need to parse each and every json to know which segment should be scheduled.
*
* API Endpoints:
* List of segment boards: /api/segments
* List of segment in segment board: /api/segments/:id/items
* Defintion of individual segment:  */
