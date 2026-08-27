import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:drift/drift.dart';
import '../data/local/database.dart';

class ConnectivityService {
  ConnectivityService(this._db, {Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity();

  final AppDatabase _db;
  final Connectivity _connectivity;

  Future<ConnectivityLogRow> check() async {
    final result = await _connectivity.checkConnectivity();
    final isOnline = result.isNotEmpty && !result.contains(ConnectivityResult.none);

    String linkType = 'none';
    if (isOnline) {
      if (result.contains(ConnectivityResult.wifi)) {
        linkType = 'wifi';
      } else if (result.contains(ConnectivityResult.mobile)) {
        linkType = 'satellite';
      } else {
        linkType = 'satellite';
      }
    }

    final checkedAt = DateTime.now().toUtc().toIso8601String();

    final companion = ConnectivityLogCompanion.insert(
      isOnline: isOnline,
      linkType: Value(linkType),
      checkedAt: Value(checkedAt),
    );

    final id = await _db.into(_db.connectivityLog).insert(companion);
    return ConnectivityLogRow(
      id: id,
      isOnline: isOnline,
      linkType: linkType,
      checkedAt: checkedAt,
    );
  }
}
