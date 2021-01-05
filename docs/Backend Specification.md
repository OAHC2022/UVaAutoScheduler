## Get API

The get api should accept POST requests with body

```js
{
    "username": "...",
    "credential": "...",
    "name": "...", // the profile name. If omitted, return all the profiles (each profile should be the latest version)
    "version": 1 // only present if "name" is present. If this field is missing, then the latest profile should be returned
}
```

and it should give a JSON response 

```js
{
    "success": true, // or false if failed,
    "message": "...", // reason for failure. If success, can put anything here
    "profiles": [ // if the name field of the request is missing, this should be a list of all profiles. Otherwise, this should be a list of 1 profile corresponding to the name and version given. 
        {
            "versions": [
                {
                    /** number of milliseconds since Unix epoch */
                    "modified": 1609794572021,
                    /** User Agent from the Http Header */
                    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
                    /** the version number */
                    "version": 1
                },
                ...
            ], // keys of all historical versions for this profile. They can be used as the "version" field to query historical profiles
            "profile": "..." // the body of the profile corresponding to the queried version. It should be the latest profile if the version number is missing
        }
    ]
}
```

## Edit API

The edit api should accept POST requests with body

```js
{
    "username": "...",
    "credential": "...",
    "action": "...", // either "delete" or "rename"
    "name": "...", // only present if action == "delete". The name of the profile to be deleted
    "oldName": "...", // only present if action == "rename". The name of the profile to be renamed
    "newName": "...", // only present if action == "rename". The new name of the profile
    "profile": "..." // only present if action == "rename". The content of the profile
}
```

It should give a JSON response indicating whether the action is performed successfully

```js
{
    "success": true, // or false if failed
    "message": "...", // reason for failure. If success, can put anything here
    /** only present if the action was rename. This gives information of all versions of the newly renamed schedule */
    "versions": [
        { // version 1
            /** number of milliseconds since Unix epoch */
            "modified": 1609794572021,
            /** User Agent from the Http Header */
            "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
            /** the version number */
            "version": 1
        }, 
        // other versions
        ...
    ]
}
```

## Save/Upload API

The save/upload api should accept POST requests with body

```js
{
    "username": "...",
    "credential": "...",
    /** list of profiles to be uploaded */
    "profiles": [{
        /** name of the profile */
        "name": "...";
        /** content of the profile */
        "profile": "...";
        /** whether to force create a new version for this file. If this field is false or is not present, then it is up to the server to decide whether to create a new version */
        "new": true
    }, ...];
}
```

It should give a JSON response indicating whether the action is performed successfully. Also, the new version number for each uploaded profiles should be included. 

```js
{
    "success": true, // or false if failed
    "message": "...", // reason for failure. If success, can put anything here
    /** information of all versions of each newly uploaded profile. If failed, omit this field */
    "versions": [
        [ // all versions of profile 1
            {
                /** number of milliseconds since Unix epoch */
                "modified": 1609794572021,
                /** User Agent from the Http Header */
                "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
                /** the version number */
                "version": 1
            }, ...
        ], ...
    ] 
}
```

## Versioning requirements

> Profiles are always uniquely identified by their names. All versions of a profile are associated with its name. 

When a profile is **uploaded** (using the save/upload api), a new version for that profile is created. Version numbers should start from 1. If previous versions exist, then increment the version number of the latest version by 1, and use it as the current version. If the previous versions are marked as detached, they should be changed to active. 

When a profile is **renamed**, the version number for its new name starts from 1. All its previous versions shall be marked as detached. Administrators can set an expiration time for the detached versions, and delete them from the database when they expire. 

When a profile is **deleted**, all its previous versions shall be marked as detached. Administrators can set an expiration time for the detached versions, and delete them from the database when they expire. 