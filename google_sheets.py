import gspread
import gspread.utils
from gspread.exceptions import WorksheetNotFound
from gspread_formatting import *
from datetime import time
import pprint
import datetime
from copy import deepcopy
import string
from timetable_scheduling import find_role, calculate_time

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
DRIVE_SCOPE = ['https://www.googleapis.com/auth/drive']

## CONNECTING TO DRIVE ATTEMPT
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


def google_drive_trial():
    service_account_json_key = 'credentials.json'
    credentials = service_account.Credentials.from_service_account_file(
                              filename=service_account_json_key, 
                              scopes=DRIVE_SCOPE)
    try:
        # create drive api client
        service = build("drive", "v3", credentials=credentials)
        parent_id = '1tpS3aASDqc8Qy6twty0U0VFBnwtBSKvt'
        paths = ['2024', '10 October']
        
        for i in range(len(paths)):
            print(parent_id, paths[i])
            file = search_file(service, parent_id, paths[i])[0]
            parent_id = file.get("id")
        
        # Get all the files in the last path
        files = search_file(service, parent_id)
        
        for file in files:
            # Process change
            print(f'Found file: {file.get("name")}, {file.get("id")}')

    except HttpError as error:
        print(f"An error occurred: {error}")



def search_file(service, parent_id, filename=None):
    files = []
    page_token = None
    
    query = f"'{parent_id}' in parents"
    if filename is not None:
        query += f' and name = "{filename}"'
    
    while True:
        response = (
            service.files()
            .list(
                q=query,
                spaces="drive",
                fields="nextPageToken, files(id, name)",
                includeItemsFromAllDrives = True,
                supportsAllDrives = True
            )
            .execute()
        )

        file = response.get("files", [])
        for file in response.get("files", []):
            # Process change
            pass
            # print(f'Found file: {file.get("name")}, {file.get("id")}')
        files.extend(response.get("files", []))
        page_token = response.get("nextPageToken", None)
        if page_token is None:
            break
    
    return files



def hex_to_rgb(hex):
  hex = hex.replace('#', '')
  return tuple(int(hex[i:i+2], 16)/255 for i in (0, 2, 4))

# For the below functions, the columns are 1 indexed instead of 0 indexed, hence theres a need to minus 1
def to_acell(row, col):
    column_names = string.ascii_uppercase
    return f'{column_names[col-1]}{row}'

def to_acell_range(first_row, first_col, last_row, last_col):
    column_names = string.ascii_uppercase
    return f'{column_names[first_col-1]}{first_row}:{column_names[last_col-1]}{last_row}'


def add_merge_request(acell_range, sheet, merge_requests):
    request = {
                "mergeCells": {
                    "range": gspread.utils.a1_range_to_grid_range(acell_range, sheet.id),
                    "mergeType": gspread.utils.MergeType.merge_all
                }
            }
    merge_requests['requests'].append(request)

def add_update_request(acell_range, value, update_requests):
    request = {
        "range": acell_range,
        "values": value
    }
    update_requests.append(request)


def upload_to_google_sheets(sheets_url, all_troopers, timetable, duty_timings, roles, flag_troopers, breakfast, dinner, last_ensurer, today=datetime.date.today() + datetime.timedelta(days=1)):
    # Convert all None to empty string
    for trooper_name, duties in timetable.items():
        for i in range(len(duties)):
            if duties[i] is None:
                timetable[trooper_name][i] = ''

    duty_timings2 = [calculate_time(timing, datetime.timedelta(hours=1)) for timing in duty_timings]
    
    client = gspread.service_account(filename='credentials.json', scopes=SCOPES)
    sh = client.open_by_url(sheets_url)

    timetable_date_weekday = today.strftime('%A').upper()
    if timetable_date_weekday == 'THURSDAY':
        sheet_name = timetable_date_weekday[:4]
    else:
        sheet_name = timetable_date_weekday[:3]
    
    try:
        worksheet = sh.worksheet(sheet_name)
    except WorksheetNotFound:
        worksheet = sh.add_worksheet(sheet_name, 100, 100)

    # Set up general cell formats
    border_obj = Border(style="SOLID")
    black_solid_borders = Borders(top=border_obj, bottom=border_obj, left=border_obj, right=border_obj)

    cell_format_template = CellFormat(
        horizontalAlignment='CENTER',
        textFormat=TextFormat(bold=True, italic=True, fontFamily='Arial', fontSize=11))
    
    cell_format_border = deepcopy(cell_format_template)
    cell_format_border.borders = black_solid_borders

    merged_cell_format_template = CellFormat(
            horizontalAlignment='CENTER',
            textFormat=TextFormat(bold=True, italic=True, fontFamily='Arial', fontSize=10))
    
    merged_cell_format_border = deepcopy(merged_cell_format_template)
    merged_cell_format_border.borders = black_solid_borders
    

    # Add and save color formatting
    colors = {
        'first_row': '#fce5cd',
        'absent': '#999999',
    }

    for role in roles:
        colors[role['name']] = role['color']
    
    colors_format = {}
    colors_format[''] = deepcopy(merged_cell_format_template)

    for key in colors:
        merged_cell_format = deepcopy(merged_cell_format_template)
        if key != 'first_row': # Just a random key not counted
            if key != 'absent':
                merged_cell_format.borders = black_solid_borders
            
            converted_colors = hex_to_rgb(colors[key])
            merged_cell_format.backgroundColor = Color(*converted_colors)
            colors_format[key] = merged_cell_format

    column_names = string.ascii_uppercase
    table_length = len(duty_timings) + 2

    # Variables for batch update
    # Batch updates are preferred to reduce the number of calls
    merge_requests = {
        'requests': []
    }
    update_requests = []
    format_requests = []


    # Set column widths
    set_column_widths(worksheet, [
        (column_names[0], 130), # Set first column (names column) to 120px width
        (column_names[table_length-1], 105), # Set last column (hours column) to 105px width
        (f'{column_names[1]}:{column_names[table_length-2]}', 100) # Set in between columns to 100px width
    ])

    # Create the first row
    first_row_format = deepcopy(cell_format_template)
    first_row_format.backgroundColor = Color(*hex_to_rgb(colors['first_row']))
    
    add_update_request('A1', [[f'DUTY {today.strftime("%d%m%y %A").upper()}']], update_requests)
    format_requests.append(('A1', first_row_format))
    add_merge_request(to_acell_range(1, 1, 1, table_length), worksheet, merge_requests)


    # Add the timings
    # i+2 since the first column is empty and indexing starts from 1
    duty_timings_str_list = [duty_timings[i].strftime('%H%M') + '-' + duty_timings2[i].strftime('%H%M') for i in range(len(duty_timings))]
    cell_range = to_acell_range(2, 2, 2, len(duty_timings) + 1)
    add_update_request(cell_range, [duty_timings_str_list], update_requests)
    format_requests.append((cell_range, merged_cell_format_border))

    # Style the leftmost and rightmost square
    format_requests.append(('A2', cell_format_border)) # Leftmost

    rightmost_cell = to_acell(2, table_length)
    add_update_request(rightmost_cell, [['HOURS']], update_requests)
    format_requests.append((rightmost_cell, colors_format['out'])) # Rightmost

    # Add the duties
    row = 3
    col = 1
    trooper_count = 0
    
    for trooper_name in all_troopers:
        trooper_count += 1

        # First column: name
        add_update_request(to_acell(row, col), [[trooper_name.upper()]], update_requests)
        format_requests.append((to_acell(row, col), cell_format_border))

        # Add duties for a present trooper
        if all_troopers[trooper_name]['present'] is True:
            duties = timetable[trooper_name]

            num_hours = sum([1 for x in duties if x is not None and x != '' and find_role(roles, x)['is_counted_in_hours']])

            # From 2nd to before last column: add duties
            duty_index = 0
            merged_cell_length = 0

            # Append a random element to the end of list to allow for comparison of the last 2
            duties.append('sdfs')

            # Keep checking for consecutive duties until you reach the last element of the list
            while duty_index <= len(duties) - 2:
                merged_cell_length = 1
                if duties[duty_index] != '' and duties[duty_index] is not None:
                    # keep incrementing if adjacent elements are the same
                    while duties[duty_index] == duties[duty_index + 1]:
                        merged_cell_length += 1
                        duty_index += 1
                
                # Write the duty to google sheets
                add_update_request(to_acell(row, duty_index+2), [[duties[duty_index].upper()]], update_requests)

                # Merge same duties if theres consecutive duties
                if merged_cell_length > 1:
                    merge_start = duty_index - merged_cell_length + 3
                    merge_end = duty_index + 2

                    add_merge_request(to_acell_range(row, merge_start, row, merge_end), worksheet, merge_requests)
                    format_requests.append((to_acell_range(row, merge_start, row, merge_end), colors_format[duties[duty_index]]))

                else:
                    format_requests.append((to_acell(row, duty_index + 2), colors_format[duties[duty_index]]))   
        

                duty_index += 1

            # Remove the random last element
            duties.pop()

        # If trooper is absent
        else:
            num_hours = 0
            absent_range = to_acell_range(row, 2, row, table_length-1)

            add_update_request(to_acell(row, 2), [[all_troopers[trooper_name]['reason_for_absence']]], update_requests)
            add_merge_request(absent_range, worksheet, merge_requests)
            format_requests.append((absent_range, colors_format['absent']))

        # Add last column: hours
        add_update_request(to_acell(row, table_length), [[str(num_hours)]], update_requests)
        format_requests.append((to_acell(row, table_length), colors_format['out']))

        # Add styling and progress to the next trooper for every trooper except the last
        if trooper_count <= len(all_troopers) - 1:
            # Add a cell with plain border for alternating rows (styling of the rows in between)
            row += 1
            format_requests.append((to_acell(row, 1), cell_format_border))
            format_requests.append((to_acell(row, table_length), colors_format['out']))

        # Go to the next row to continue printing out the next trooper duties
        row += 1


    # # STYLING BOTTOM ROW
    flag_text = 'FLAG:' + ' // '.join([trooper_name.upper() for trooper_name in flag_troopers])
    bottom_row_side_cell_format = CellFormat(
        verticalAlignment = 'BOTTOM',
        horizontalAlignment = 'CENTER',
        backgroundColor = Color(*hex_to_rgb('#00ff00')),
        textFormat = TextFormat(bold=True, italic=True, fontFamily='Arial', fontSize=11),
        borders=black_solid_borders
    )
    bottom_row_middle_cell_format = CellFormat(
        verticalAlignment = 'BOTTOM',
        horizontalAlignment = 'CENTER',
        textFormat = TextFormat(bold=True, italic=True, fontFamily='Arial', fontSize=11, foregroundColor=Color(*hex_to_rgb('#ff0000'))),
        borders=black_solid_borders
    )

    # Adding flag formatting
    add_update_request(to_acell(row, 1), [[flag_text]], update_requests)
    add_merge_request(to_acell_range(row, 1, row+2, 3), worksheet, merge_requests)
    format_requests.append((to_acell_range(row, 1, row+2, 3), bottom_row_side_cell_format))

    # Adding last ensurer formatting
    last_ensurer_text = f'LAST ENSURER: {last_ensurer.upper()}'
    add_update_request(to_acell(row, table_length-3), [[last_ensurer_text]], update_requests)
    add_merge_request(to_acell_range(row, table_length-3, row+2, table_length), worksheet, merge_requests)
    format_requests.append((to_acell_range(row, table_length-3, row+2, table_length), bottom_row_side_cell_format))

    # Adding breakfast/dinner formatting
    dinner_text = f'BREAKFAST:{breakfast.upper()} // DINNER:{dinner.upper()}'
    add_update_request(to_acell(row, 4), [[dinner_text]], update_requests)
    add_merge_request(to_acell_range(row, 4, row+2, table_length-4), worksheet, merge_requests)
    format_requests.append((to_acell_range(row, 4, row+2, table_length-4), bottom_row_middle_cell_format))

    # Batch update to reduce API calls
    try:
        worksheet.batch_update(update_requests)
        format_cell_ranges(worksheet, format_requests)
        client.http_client.batch_update(sh.id, merge_requests)
    except:
        raise Exception('Unable to update google sheet')



def main():
    trial_timetable = {'hakim': ['in', 'in', 'x-ray', 'sentry', 'sentry', 'sentry', 'MA', 'MA', 'MA', 'MA', 'MA', None], 'jian jun': ['sentry', 'sentry', 'sentry', 'in', 'out', 'desk', '', '', '', '', '', ''], 'kah fai': ['', '', '', '', '', '', 'sentry', 'sentry', 'sentry', 'out', 'x-ray', 'x-ray'], 'di er': ['', '', '', '', '', '', 'desk', 'x-ray', 'out', 'sentry', 'sentry', 'sentry'], 'xavier': ['desk', 'desk', 'out', 'desk', 'in', 'x-ray', '', '', '', '', '', ''], 'aniq': ['', '', '', '', '', '', 'x-ray', 'desk', 'x-ray', 'desk', 'PAC', 'PAC'], 'joshua': ['', '', '', '', '', '', 'out', 'in', 'desk', 'in', 'desk', 'desk'], 'hilmi': ['', 'SCA1', 'SCA1', '', '', '', '', 'out', 'in', '', 'out', 'out'], 'hugo': ['out', 'out', 'desk', '', '', '', '', '', '', 'x-ray', 'in', 'in'], 'dhruva': ['', 'SCA2', 'SCA2', 'x-ray', 'desk', 'out', 'in', '', '', '', '', ''], 'marc': ['x-ray', 'x-ray', 'in', 'out', 'x-ray', 'in', '', '', '', '', '', '']}
    trial_all_troopers = {'hakim': {'type': 'combat', 'status': 'stay-in', 'permanent': True, 'excuse_rmj': False, 'present': True}, 'jian jun': {'type': 'combat', 'status': 'stay-in', 'permanent': True, 'excuse_rmj': False, 'present': True}, 'kah fai': {'type': 'combat', 'status': 'stay-in', 'permanent': True, 'excuse_rmj': False, 'present': True}, 'di er': {'type': 'combat', 'status': 'stay-in', 'permanent': True, 'excuse_rmj': False, 'present': True}, 'xavier': {'type': 'service', 'status': 'stay-in', 'permanent': True, 'excuse_rmj': False, 'present': True}, 'aniq': {'type': 'service', 'status': 'stay-in', 'permanent': True, 'excuse_rmj': False, 'present': True}, 'jun': {'type': 'service', 'status': 'stay-in', 'permanent': True, 'excuse_rmj': True, 'present': False, 'reason_for_absence': 'MC'}, 'aniish': {'type': 'service', 'status': 'stay-in', 'permanent': True, 'excuse_rmj': False, 'present': False, 'reason_for_absence': 'MC'}, "syafi'i": {'type': 'service', 'status': 'stay-out', 'permanent': True, 'excuse_rmj': True, 'present': False, 'reason_for_absence': 'AL'}, 'joshua': {'type': 'service', 'status': 'stay-out', 'permanent': True, 'excuse_rmj': False, 'present': True}, 'hilmi': {'type': 'service', 'status': 'stay-in', 'permanent': True, 'excuse_rmj': True, 'present': True}, 'hugo': {'type': 'service', 'status': 'stay-in', 'permanent': True, 'excuse_rmj': False, 'present': True}, 'dhruva': {'type': 'service', 'status': 'stay-in', 'permanent': True, 'excuse_rmj': False, 'present': True}, 'marc': {'type': 'service', 'status': 'stay-in', 'permanent': True, 'excuse_rmj': False, 'present': True}}
    duty_timings = [time(x) for x in range(6, 18)]
    roles = [
        {
            'name': 'in',
            'timing': 'all-day',
            'color': '#ffff00',
            'is_standing': True,
            'is_counted_in_hours': True,
            'is_custom': False
        },
        {
            'name': 'out',
            'timing': 'all-day',
            'color': '#ff9900',
            'is_standing': True,
            'is_counted_in_hours': True,
            'is_custom': False
        },
        {
            'name': 'SCA1',
            'timing': [time(7), time(8)],
            'color': '#ff00ff',
            'is_standing': True,
            'is_counted_in_hours': True,
            'is_custom': False
        },
        {
            'name': 'SCA2',
            'timing': [time(7), time(8)],
            'color': '#ff00ff',
            'is_standing': True,
            'is_counted_in_hours': True,
            'is_custom': False
        },
        {
            'name': 'sentry',
            'timing': 'all-day',
            'color': '#ff0000',
            'is_standing': False,
            'is_counted_in_hours': True,
            'is_custom': False
        },
        {
            'name': 'x-ray',
            'timing': 'all-day',
            'color': '#00ffff',
            'is_standing': False,
            'is_counted_in_hours': True,
            'is_custom': False
        },
        {
            'name': 'desk',
            'timing': 'all-day',
            'color': '#00ff00',
            'is_standing': False,
            'is_counted_in_hours': True,
            'is_custom': False
        },
        {
            'name': 'PAC',
            'timing': [time(16), time(17)],
            'color': '#f4cccc',
            'is_standing': False,
            'is_counted_in_hours': True,
            'is_custom': False
        },
        {
            'name': 'MR',
            'timing': 'all-day',
            'color': '#999999',
            'is_standing': False,
            'is_counted_in_hours': False,
            'is_custom': True
        },
        {
            'name': 'MA',
            'timing': 'all-day',
            'color': '#999999',
            'is_standing': False,
            'is_counted_in_hours': False,
            'is_custom': True
        },
        {
            'name': 'prowl',
            'timing': 'all-day',
            'color': '#999999',
            'is_standing': True,
            'is_counted_in_hours': True,
            'is_custom': True
        },
    ]

    flag_troopers = ['jian jun', 'marc', 'hakim']
    breakfast = 'hugo'
    dinner = 'hilmi'
    last_ensurer = 'dhruva'
    # upload_to_google_sheets('https://docs.google.com/spreadsheets/d/1YTH68Mh-T0vgkv5ov0ifp3ybNhOkzVBLRe9INzhwcuo/edit?gid=0#gid=0', trial_all_troopers, trial_timetable, duty_timings, roles, flag_troopers, breakfast, dinner, last_ensurer, today=datetime.date(2024, 10, 4))
    google_drive_trial()

if __name__ == "__main__":
    main()