import { DocumentTableViewGrid } from '@gitbook/api';
import { TableRecordKV, TableViewProps } from './Table';
import { tcls } from '@/lib/tailwind';
import { RecordColumnValue } from './RecordColumnValue';

export async function RecordRow(
    props: TableViewProps<DocumentTableViewGrid> & {
        record: TableRecordKV;
    },
) {
    const { view } = props;

    return (
        <tr>
            {view.columns.map((column) => {
                return (
                    <td key={column} className={tcls('border', 'border-slate-700', 'px-2', 'py-1')}>
                        <RecordColumnValue key={column} {...props} column={column} />
                    </td>
                );
            })}
        </tr>
    );
}