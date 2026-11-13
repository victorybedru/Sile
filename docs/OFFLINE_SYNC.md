# Offline Synchronization

Sile supports report submission when the user has limited or no internet access.

## Workflow
1. A report is saved in IndexedDB.
2. The report is marked as pending synchronization.
3. When connectivity is available, the application sends pending reports to the backend.
4. Successful submissions are marked as synchronized.
5. Failed submissions remain available for retry.

This approach helps prevent users from losing reports due to temporary network interruptions.
