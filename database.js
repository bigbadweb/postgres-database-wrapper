const { Pool, Client } = require('pg');
/**
 * The interface to the database, with some convenience methods
 */
class DatabaseService {
	constructor(
		connectionString = 'postgres://user:pass@localhost:5342/dbname?sslmode=disable'
	) {
		this.connected = this.connect(connectionString)
			.then((pool) => {
				this.connection = pool;
			})
			.catch((err) => {
				throw err;
			});
	}

	connect(connectionString) {
		return new Promise((resolve, reject) => {
			this.pool = new Pool({
				connectionString: connectionString,
				ssl: { rejectUnauthorized: false },
			});
			resolve(this.pool);
		});
	}

	query(sql, params = undefined, namedQuery = null) {
		let query = {
			name: namedQuery,
			text: sql,
			values: params,
		};
		return this.connection.query(sql, params);
	}

	upsert(sql, params = undefined) {
		return this.query(sql, params);
	}

	async insert(sql, params = undefined) {
		const results = await this.query(sql, params).catch((err) => {
			throw err;
		});
		return results;
	}

	/**
	 * Helper method to insert a record an return it's ID
	 */
	async insertOne(sql, params = undefined, idCol = 'id') {
		const results = await this.insert(sql, params).catch((err) => {
			throw err;
		});
		return results.rows[0][idCol];
	}

	async delete(sql, params = undefined) {
		const results = await this.query(sql, params).catch((err) => {
			throw err;
		});
		return results;
	}
	async deleteOne(sql, params = undefined) {
		const results = await this.query(sql, params).catch((err) => {
			throw err;
		});

		if (results.rowCount == 1) {
			return true;
		} else if (results.rowCount > 1) {
			throw new Error('More than one row deleted');
		} else {
			throw new Error('No matching records to delete');
		}
	}

	async deleteMany(sql, params = undefined) {
		const results = await this.query(sql, params).catch((err) => {
			throw err;
		});

		if (results.rowCount >= 1) {
			return results.rowCount; // truthy
		} else {
			return false;
		}
	}

	async findOne(sql, params = undefined) {
		const results = await this.query(sql, params).catch((err) => {
			throw err;
		});
		if (results.rowCount == 1) {
			return results.rows.pop();
		}
		if (results.rowCount > 1) {
			throw new Error('Multiple records found, possible cartesian produced');
		}
		// if (results.rowCount == 0) {
		// 	throw new Error('No records found');
		// }

		return null;
	}

	async findMany(sql, params = undefined) {
		const results = await this.query(sql, params).catch((err) => {
			throw err;
		});
		return results.rows;
	}

	async update(sql, params = undefined) {
		const results = await this.query(sql, params).catch((err) => {
			throw err;
		});
		return results.rowCount;
	}

	end() {
		return this.pool.end();
	}

	/**
	 * Generates cols and params suitable for a DB update
	 * @param  {Array}  FIELDS     [description]
	 * @param  {Object} updateData [description]
	 * @param  {Array}  params     [description]
	 * @return {[type]}            [description]
	 */
	generateUpdateParams(FIELDS = [], updateData = {}, params = []) {
		let cols = [];
		for (let key of FIELDS) {
			if (key in updateData) {
				cols.push(`${key} = $${params.length + 1}`);
				params.push(updateData[key]);
			}
		}
		return { cols, params };
	}

	/**
	 * Generates cols and params suitable for a DB update
	 * @param  {Array}  FIELDS     [description]
	 * @param  {Object} updateData [description]
	 * @param  {Array}  params     [description]
	 * @return {[type]}            [description]
	 */
	generateInsertParams(FIELDS = [], insertData = {}, params = []) {
		let cols = [];
		let placeholders = [];
		for (let key of FIELDS) {
			if (key in insertData) {
				cols.push(key);
				placeholders.push(`$${params.length + 1}`);
				params.push(insertData[key]);
			}
		}
		return { cols, placeholders, params };
	}

	/**
	 * Takes an object and constructs an insert based on the keys
	 */
	async insertTable(
		tableName,
		data,
		returning = undefined,
		onConflict = undefined // update/do nothing etc.
	) {
		let FIELDS = Object.keys(data);
		let { cols, placeholders, params } = this.generateInsertParams(
			FIELDS,
			data
		);

		const RETURNING_SQL = returning ? `RETURNING ${returning}` : '';
		const ON_CONFLICT = onConflict ? `ON CONFLICT ${onConflict}` : '';
		const sql = `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders}) ${ON_CONFLICT} ${RETURNING_SQL}`;
		const inserted = await this.insert(sql, params);
		if (inserted.rowCount == 0) {
			return false;
		} else {
			return inserted.rows;
		}
	}

	/**
	 * Generates and executes a simple table update, where there is only a single table invovled
	 *
	 * @param  {String} tableName      name of table to update
	 * @param  {Object} updateData     The object to update the table with
	 * @param  {int} id     The primary key id
	 * @param  {String[] = undefined} ALLOWED_FIELDS a list of allowed fields to update if not defined, then all object keys are used
	 * @param  {String = 'id'} pkeyName       name of the column for the primary key
	 * @return {Object}
	 */
	async updateTable(
		tableName,
		data,
		id,
		ALLOWED_FIELDS = undefined,
		pkeyName = 'id',
		updateDateColumn = null
	) {
		let FIELDS = ALLOWED_FIELDS || Object.keys(data);

		let { cols, params } = this.generateUpdateParams(FIELDS, data, [id]);

		if (updateDateColumn) {
			cols.push(`${updateDateColumn} = CURRENT_TIMESTAMP`);
		}
		if (cols.length == 0) {
			let err = new Error('Nothing to update');
			err.status = 304;
			throw err;
		}

		const sql = `UPDATE ${tableName} SET ${cols} WHERE ${pkeyName} = $1`;

		let result = await this.update(sql, params).catch((err) => {
			console.error(err);
			throw err;
		});

		return result;
	}
}

module.exports = DatabaseService;
