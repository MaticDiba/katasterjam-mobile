export function openNativeDatabase (filePath) {
  return new Promise((resolve, reject) => {
    if (!window.sqlitePlugin) {
      reject(new Error('Cordova SQLite plugin not available'))
      return
    }

    const fileName = filePath.split('/').pop()

    const db = window.sqlitePlugin.openDatabase(
      { name: fileName, location: 'default' },
      () => resolve(createDbHandle(db)),
      (err) => reject(new Error('Failed to open native database: ' + (err?.message || err)))
    )
  })
}

function createDbHandle (db) {
  return {
    query (sql, params = []) {
      return new Promise((resolve, reject) => {
        db.executeSql(sql, params, (rs) => {
          const rows = []
          for (let i = 0; i < rs.rows.length; i++) {
            rows.push(rs.rows.item(i))
          }
          resolve(rows)
        }, (err) => {
          reject(new Error('SQL error: ' + (err?.message || err)))
        })
      })
    },

    queryTile (z, x, tmsY) {
      return new Promise((resolve, reject) => {
        db.executeSql(
          'SELECT HEX(tile_data) AS tile_hex FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?',
          [z, x, tmsY],
          (rs) => {
            if (rs.rows.length > 0) {
              resolve(hexToUint8Array(rs.rows.item(0).tile_hex))
            } else {
              resolve(null)
            }
          },
          (err) => reject(new Error('Tile query error: ' + (err?.message || err)))
        )
      })
    },

    close () {
      db.close(() => {}, () => {})
    }
  }
}

function hexToUint8Array (hex) {
  const len = hex.length / 2
  const arr = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    arr[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return arr
}
