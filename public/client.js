var socket = io();
$(function() {
	var dangerAlert = $('#dangerAlert');
	
	socket.on('setSites', function(data) {
		var siteTable = $('#siteTable');
		$('#siteTable .siteInfo').remove();
		data.sites.forEach(function(item) {
			siteTable.append(formatSiteItem(item, data.sitesData[item.Id]));
		});
		$('#lastUpdate').text(new Date().toString('dd.MM.yyyy HH:mm:ss'));
	});
	
	socket.on('setSite', function(item) {
		$('#siteTable .site-' + item.site.Id).replaceWith(formatSiteItem(item.site, item.data));
		$('#lastUpdate').text(new Date().toString('dd.MM.yyyy HH:mm:ss'));
	});
	
	socket.on('setSiteInProcess', function(id) {
		$('#siteTable .site-' + id + ' td.id').html('<i class="glyphicon glyphicon-forward"></i>');
	});
	
	socket.on('error', function(data) {
		$('#siteTable tr.siteInfo').remove();
		dangerAlert.show();
		dangerAlert.text('Извините, произошла ошибка при подключении к серверу. Текст ошибки: ' + data.message);
	});
	
	socket.on('connect', function() {
		dangerAlert.hide();
		socket.emit('getSites');
	});
});

formatSiteItem = function(item, data) {
	var id = item.Id;
	var name = item.Name;
	var uri = '<a href="' + item.Uri + '">' + item.Uri + '</a>';
	var statusText = (typeof(data.lastStatusText) !== 'undefined') ? data.lastStatusText : 'No data';
	var date = (typeof(data.lastStatusDate) !== 'undefined') ? new Date(data.lastStatusDate).toString('dd.MM.yyyy HH:mm:ss') : '-';
	var additionalTrStyle = (data.lastStatus === false) ? ' danger' : '';
	var statusStyle = (typeof(data.lastStatus) !== 'undefined') ? (data.lastStatus ? 'label-success' : 'label-danger') : 'label-default';
	
	return '<tr class="siteInfo site-' + id + additionalTrStyle + '"><td class="id">' + id + '</td><td>' + name + '</td><td>' + uri + '</td><td><span class="label ' + statusStyle + '">' + statusText + '</span></td><td>' + date + '</td></tr>';
};