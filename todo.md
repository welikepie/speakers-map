# GRAND TO-DO

* **[DONE]** Get the basic map display to work
* **[DONE]** Set up core data file for speakers (to refer when working)
* **[DONE]** Establish basic marker & tooltip display
* **[DONE]** Complete the data schema
* **[DONE]** Check how MapBox works with MultiPoint GeoJSON structure instead of Point in speaker data
  * It doesn't, the data is not parsed if it's not a Point. Will have to stora additional location data as non-GeoJSON.
* Implement marker filtering by tags, employers
* Implement proper UI for handling the filtering
  * Tooltip styling - info about the speakers
  * Tag filtering for multiple tags (tickbox list)
  * Employer filtering for employers with X or more speakers
* Marker clustering
  * Shamelessly steal from whatever sources are available
