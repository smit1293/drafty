import argparse
import itertools
import os
import sys
import pandas as pd

import pymysql

sql_col_order = """
                SELECT * FROM SuggestionType st WHERE isActive = 1 ORDER BY st.columnOrder
                """

sql_click = """
SELECT i.timestamp, i.idInteractionType, it.interaction, i.idSession, ses.idProfile, c.*
FROM Interaction i
INNER JOIN users.Session ses ON ses.idSession = i.idSession
INNER JOIN InteractionType it ON it.idInteractionType = i.idInteractionType
INNER JOIN Click c on i.idInteraction = c.idInteraction
WHERE ses.idProfile = %s;
"""

sql_double_click = """
SELECT i.timestamp, i.idInteractionType, it.interaction, i.idSession, ses.idProfile, dc.*
FROM Interaction i
INNER JOIN users.Session ses ON ses.idSession = i.idSession
INNER JOIN InteractionType it ON it.idInteractionType = i.idInteractionType
INNER JOIN DoubleClick dc on i.idInteraction = dc.idInteraction
WHERE ses.idProfile = %s;
"""

def get_db_creds():
    dbuser, dbpass = 'test', 'test'
    with open('../backend/.env', 'r') as fh:
        for line in fh.readlines():
            kv = line.strip().split('=')
            k = kv[0]
            #if k == 'DB_USER':
            if k == 'DB_USER_PROD':
                dbuser = kv[1]
            #if k == 'DB_PASSWORD':
            if k == 'DB_PASS_PROD':
                dbpass = kv[1]
    return dbuser, dbpass

def column_order_test(cursor):
    cursor.execute(sql_col_order)
    rows = cursor.fetchall()
    print(rows,'\n')
    for r in rows:
        print(r['idSuggestionType'],r['name'])

def click_test(cursor):
    example_idProfile = 66430
    cursor.execute(sql_click, (example_idProfile))
    rows = cursor.fetchall()
    #print(rows,'\n')
    for r in rows:
        print(r)

def double_click_test(cursor):
    example_idProfile = 66430
    cursor.execute(sql_double_click, (example_idProfile))
    rows = cursor.fetchall()
    #print(rows,'\n')
    for r in rows:
        print(r)

if __name__ == '__main__':
    # python3 main.py --host 128.148.36.16 --database csprofessors
    parser = argparse.ArgumentParser(description='Write database data to table HTML file.')
    parser.add_argument('--host', default='localhost',
                        help='The host of the MySQL database')
    parser.add_argument('--database', default='csprofessors',
                        help='The database to be outputtted')
    args = parser.parse_args()

    db_user,db_pass = get_db_creds()
    db = pymysql.connect(host=args.host, user=db_user,
                         password=db_pass,
                         db=args.database, charset='utf8mb4',
                         cursorclass=pymysql.cursors.DictCursor)

    try:
        with db.cursor() as cursor:
            column_order_test(cursor)
            click_test(cursor)
    except Exception as e:
        print('ERROR exiting...')
        print(e)
        exc_type, exc_obj, exc_tb = sys.exc_info()
        fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
        print(exc_type)
        print(fname)
        print(exc_tb.tb_lineno)
    finally:
        db.close()