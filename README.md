# Posgres Database Wrapper


## Install

`npm install --save https://github.com/bigbadweb/postgres-database-wrapper.git`

## Usage

Depends on the `pg` npm package - `npm install pg`;



```.js
const Database = require('@bigbadweb/postgres-database-wrapper');

const db = new Database('postgres://user:pass@dbhost:5342/dbname?sslmode=disable');

const params = [99]
let result = await db.query('SELECT * FROM table WHERE id = $1', params).catch(err => {
        // handle err
    })


```