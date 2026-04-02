const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const proj4 = require('proj4');

// EPSG:3826 = TWD97 / TM2 zone 121
proj4.defs("EPSG:3826", "+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");

async function calculateScopes() {
  const db = await open({
    filename: path.join(__dirname, 'sewerage.db'),
    driver: sqlite3.Database
  });

  try {
    // 1. Add columns if not exist
    await db.exec(`
      ALTER TABLE projects ADD COLUMN bbox_min_x REAL;
      ALTER TABLE projects ADD COLUMN bbox_min_y REAL;
      ALTER TABLE projects ADD COLUMN bbox_max_x REAL;
      ALTER TABLE projects ADD COLUMN bbox_max_y REAL;
    `).catch(() => { /* Columns might already exist */ });

    // 2. Fetch all pipelines to calculate bounds
    console.log("Fetching pipelines to compute bounds...");
    const pipelines = await db.all(`
      SELECT DISTINCT p.name as project_name, p.id as project_id
      FROM projects p
    `);

    // Actually, we don't have a direct "project_name" mapping in pipelines for all.
    // Let's see what project_name is in pipelines.
    const pipeStats = await db.all(`SELECT project_name, COUNT(*) as count, MIN(upstream_node) as ex_up FROM pipelines GROUP BY project_name`);
    console.log("Available projects in pipelines table (samples):", pipeStats);
    
    // Similarly for manholes
    const mhStats = await db.all(`SELECT project_name, COUNT(*) as count FROM manholes GROUP BY project_name`);
    console.log("Available projects in manholes table (samples):", mhStats);

    // Let's compute BBOX for each distinct project_name found in manholes (which have x, y)
    // and pipelines (if we had x,y, but manholes are enough to bound the area generally).

    // Compute Town-level BBOX from manholes
    const bboxes = await db.all(`
      SELECT 
             CASE 
               WHEN project_name LIKE '%竹北%' THEN '竹北市'
               WHEN project_name LIKE '%竹東%' THEN '竹東鎮'
               WHEN project_name LIKE '%新豐%' THEN '新豐鄉'
               WHEN project_name LIKE '%湖口%' THEN '湖口鄉'
               WHEN project_name LIKE '%芎林%' THEN '芎林鄉'
               ELSE '其他'
             END as town,
             MIN(x) as min_x, MAX(x) as max_x,
             MIN(y) as min_y, MAX(y) as max_y
      FROM manholes
      WHERE project_name IS NOT NULL AND project_name != ''
        AND x BETWEEN 100000 AND 400000
        AND y BETWEEN 2000000 AND 3000000
      GROUP BY town
    `);

    console.log(`Computed bounds for ${bboxes.length} regions based on manholes.`);

    let matched = 0;
    const updateStmt = await db.prepare(`UPDATE projects SET bbox_min_x=?, bbox_max_x=?, bbox_min_y=?, bbox_max_y=? WHERE name LIKE ?`);

    for (const box of bboxes) {
      if (box.town === '其他') continue;
      
      const likeQuery = `%${box.town.substring(0,2)}%`; // e.g., '%竹北%'
      
      // Convert TWD97 (EPSG:3826) to WGS84 (EPSG:4326)
      // proj4 function takes [x, y], returns [longitude, latitude]
      const [minLng, minLat] = proj4("EPSG:3826", "EPSG:4326", [box.min_x, box.min_y]);
      const [maxLng, maxLat] = proj4("EPSG:3826", "EPSG:4326", [box.max_x, box.max_y]);

      const m = await updateStmt.run(minLng, maxLng, minLat, maxLat, likeQuery);
      if (m.changes > 0) {
        matched += m.changes;
        console.log(`Mapped Region Bounds [${box.town}] TO ${m.changes} active Projects.`);
      }
    }

    await updateStmt.finalize();

    console.log(`Updated regional bounds for ${matched} active projects.`);

  } catch (e) {
    console.error('Error calculating scopes:', e);
  } finally {
    await db.close();
  }
}

calculateScopes();
