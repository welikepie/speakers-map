# Speaker Data Schema

The JSON schema has been provided to verify the proper format for the submitted data.It can be used to ensure all the required fields are present. The precise structure can be figured out by reading the schema, but for basic application, one can take a look at the example.

## Example

    {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [ // This is where the geo-location will be specified
                -0.126611,   // - longitude
                53           // - latitude
            ]
        },
        
        "properties": {
            "name": "John Doe", // Your name
			"title": "Wooden Technician", // Job title you feel most comfortably with
            "description": "A person with quite possibly most well-known name in the world.", // Short description of you
            "employers": ["We Make Planks", "Timber R US"], // List of your employers you'd like to make public
            
            "specialties": [ // List of your best skills, stuff you could do a talk about
                "Cutting", "Measuring", "Imperial measurement system"
            ],
            
            "websites": [ // Whichever websites you use to represent online
				"http://allthebestplanks.blogspot.com",
                "http://uk.linkedin.com/in/john.doe",
                "https://plankhub.com/john.doe"
            ],
			
			"contact": [ // Means of contacting you
                {
                    "type": "mail",
                    "value": "john.doe@planksrus.com"
                },
                {
                    "type": "msn",
                    "value": "the_plankster"
                },
				{
					"type": "irc",
					"value": "leafnode.net:6667/#ents
				}
            ],
            
            "services": [ // Various web services with explicit hooks / handlers
                {
                    "type": "twitter",
                    "value": "the_plankster"
                }
            ]
        }
    }