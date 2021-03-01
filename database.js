const { Pool, Client } = require('pg');
/**
 * The interface to the database, with some convenience methods
 */
class DatabaseService {
	constructor(
		connectionString = 'postgres://user:pass@localhost:5342/dbname?sslmode=disable'
	) {
		this.connect(connectionString)
			.then((connection) => {
				this.connection = connection;
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
	async delete(sql, params = undefined) {
		const results = await this.query(sql, params).catch((err) => {
			throw err;
		});
		return results;
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


}

module.exports = DatabaseService;
