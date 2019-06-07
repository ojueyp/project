/**
 * Puddlr Help Center Script
 */
;(function () {
	'use strict';

	var app = {
		pathName: null,
		menu: null,
		menuList: {},
		searchText: '',
		smallScreenCriteria: 960,

		maxFileCount: 10,
		maxFileSize: (1024 * 1024 * 10), // 10MB
		maxTotalSize: (1024 * 1024 * 50), // 50MB

		state: {
			requiredInput: {},
			uploadError: {},
			uploadTotalCount: 0,
			uploadTotalSize: 0,
			canSubmit: false,
			isSubmit: false,

			isLoading: true,
			isReady: false,
			isSearch: false,
			isLargeScreen: false,
			isSmallScreen: false
		}
	};

	app.initialize = function () {
		app.pathName = location.pathname;
		if (_.endsWith(app.pathName, '/')) {
			app.pathName = app.pathName.substring(0, app.pathName.length - 1);
		}

		if (app.pathName === '/puddlr/help/counsel' || app.pathName === '/puddlr/adm/counsel') {
			app.activateCounsel();

			app.activateUploader();

			app.activateValidator();
		}
		else {
			app.activateWindowEvent();

			app.activateMenu();

			app.activateSearch();

			$(window).trigger('hashchange');
			$(window).trigger('resize');
		}
	};

	app.activateCounsel = function () {
		$('#contents_normal').show();

		$('#browser').select2({
			theme: 'puddlr',
			width: '100%',
			minimumResultsForSearch: Infinity
		});
	};

	app.activateUploader = function () {
		var d = new Date();
		var uid = String(d.getTime()) + String(Math.floor(Math.random() * 999) + 1);
		$('#tmpfilekey').val(uid);

		$('#fileupload').fileupload({
			url: ('/puddlr/help/upload_attach?bd_id=1&key=' + uid),
			dropZone: $('#dropzone'),
			acceptFileTypes: /(\.|\/)(bmp|gif|jpe?g|png|raw|svg|tif)$/i,

			maxFileSize: app.maxFileSize,
			maxNumberOfFiles: app.maxFileCount
		});

/*
		$('#fileupload').fileupload(
			'option',
			'redirect',
			window.location.href.replace(
				/\/[^\/]*$/,
				'/cors/result.html?%s'
			)
		);
*/

		$(document).bind('dragover', function (e) {
			var dropZone = $('#dropzone');
			var timeout = window.dropZoneTimeout;

			if ( ! timeout) {
				dropZone.addClass('in');
			}
			else {
				clearTimeout(timeout);
			}

			var found = false;
			var node = e.target;

			do {
				if (node === dropZone[0]) {
					found = true;
					break;
				}

				node = node.parentNode;
			} while (node != null);

			if (found) {
				dropZone.addClass('hover');
			}
			else {
				dropZone.removeClass('hover');
			}

/*
			window.dropZoneTimeout = setTimeout(function () {
				window.dropZoneTimeout = null;
				dropZone.removeClass('in hover');
			}, 100);
*/
		});

		$(document).bind('dragleave', '#dropzone.in, #dropzone.hover', function (e) {
			var oe = e.originalEvent;

			if (oe.screenX === 0 && oe.screenY === 0) {
				$('#dropzone').removeClass('in hover');
			}
		});

		$(document).bind('drop dragover', function (e) {
			e.preventDefault();

			if (e.type === 'drop') {
				$('#dropzone').removeClass('in hover');
			}
		});
	};

	app.activateValidator = function () {
		$.each($('[data-required]'), function (idx, elem) {
			var input_name = $(elem).attr('name');

			app.state.requiredInput[input_name] = false;

			$(elem).on('input keyup blur', _.debounce(function (e) {
				var trimmed = $.trim($(this).val());
				var $label_element = $('#label_' + input_name);

				if (trimmed === '') {
					$label_element.text('');
					$(this).removeClass('error');
					app.state.requiredInput[input_name] = false;
					app.checkSubmit();
					return false;
				}

				var format_type = $(this).data('format');

				if (format_type === 'email') {
					var email_regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/;

					if (email_regex.test(trimmed) === false) {
						$label_element.text('이메일 형식을 확인해 주세요.');
						$(this).addClass('error');
						app.state.requiredInput[input_name] = false;
						app.checkSubmit();
						return false;
					}
				}

				$label_element.text('');
				$(this).removeClass('error');
				app.state.requiredInput[input_name] = true;
				app.checkSubmit();
			}, 200));
		});

		$('#fileupload')
		.bind('fileuploadprocessalways', function (e, data) {
			var error_type = data.files[0].error;

			if (error_type !== undefined) {
				if (app.state.uploadError[error_type] === undefined) {
					app.state.uploadError[error_type] = 0;
				}

				app.state.uploadError[error_type] += 1;
			}

			app.state.uploadTotalCount += 1;
			app.state.uploadError['Maximum number of files exceeded'] = Math.max(0, app.state.uploadTotalCount - app.maxFileCount);

			app.state.uploadTotalSize += data.files[0].size;
			if (app.state.uploadTotalSize > app.maxTotalSize) {
				app.state.uploadError['Maximum totalsize exceeded'] = 1;
			}
			else {
				app.state.uploadError['Maximum totalsize exceeded'] = 0;
			}

			app.checkSubmit();
		})
		.bind('fileuploadfail', function (e, data) {
			var error_type = data.files[0].error;

			if (error_type !== undefined) {
				app.state.uploadError[error_type] -= 1;
			}

			app.state.uploadTotalCount -= 1;
			app.state.uploadError['Maximum number of files exceeded'] = Math.max(0, app.state.uploadTotalCount - app.maxFileCount);

			app.state.uploadTotalSize -= data.files[0].size;
			if (app.state.uploadTotalSize > app.maxTotalSize) {
				app.state.uploadError['Maximum totalsize exceeded'] = 1;
			}
			else {
				app.state.uploadError['Maximum totalsize exceeded'] = 0;
			}

			app.checkSubmit();
		})
		.bind('fileuploadstop', function (e) {
			app.submitCounsel();
		});

		$('#fileupload').on('submit', function (e) {
			if (app.state.canSubmit === false) {
				return false;
			}

			if (app.state.isSubmit === true) {
				return false;
			}

			app.state.isSubmit = true;

			$.each($('[data-required]'), function (idx, elem) {
				$(elem).prop('readonly', true);
			});
			$('[name="browser"] option:not(:selected)').prop('disabled', true);
			$('[name="upload_file"]').prop('disabled', true);
			$('#counsel_submit').prop('disabled', true);

			if (app.state.uploadTotalCount > 0) {
				$('.fileupload-buttonbar').find('.btn.start').trigger('click');
			}
			else {
				app.submitCounsel();
			}

			return false;
		});
	};

	app.checkSubmit = function () {
		var judgment = true;
		var errorCount = 0;

		for (var key in app.state.requiredInput) {
			judgment = (judgment && app.state.requiredInput[key]);
		}

		for (var key in app.state.uploadError) {
			errorCount += app.state.uploadError[key];
		}

		judgment = (judgment && (errorCount === 0));
		app.state.canSubmit = judgment;
		$('#counsel_submit').prop('disabled', !judgment);

		if (app.state.uploadError['Maximum number of files exceeded'] > 0) {
			$('#label_upload_file').text('최대 10장의 이미지 파일을 첨부할 수 있습니다.');
		}
		else if (app.state.uploadError['File type not allowed'] > 0) {
			$('#label_upload_file').text('파일 형식을 확인해 주세요. bmp, jpeg, jpg, gif, png, tif, raw, svg 형식의 파일만 업로드할 수 있습니다.');
		}
		else if (app.state.uploadError['File is too large'] > 0) {
			$('#label_upload_file').text('10MB 이하의 이미지 파일만 첨부할 수 있습니다.');
		}
		else if (app.state.uploadError['Maximum totalsize exceeded'] > 0) {
			$('#label_upload_file').text('이미지 파일의 1회 업로드 제한 용량은 50MB 입니다.');
		}
		else {
			$('#label_upload_file').text('');
		}
	}

	app.submitCounsel = function () {
		var post_data = $('#fileupload').serializeArray();

		$.ajax({
			data: post_data,
			dataType: 'json',
			method: 'post',
			url: '/puddlr/help/counsel_save'
		})
		.done(function (data) {
			alert(data.MSG);
			setCookie('loadback', true, 1);
			location.reload();
		});
	};

	app.activateWindowEvent = function () {
		$(window).on('hashchange', function () {
			var hash = location.hash;
			var arr = hash.split(/#search\/?/);

			if (arr[1] === undefined || arr[1] === '') {
				$('#contents_normal').show();
				$('#contents_search').hide();

				app.searchText = '';
				app.state.isSearch = false;
			}
			else if (arr[1] !== '') {
				$('#contents_normal').hide();
				$('#contents_search').show();

				app.searchText = decodeURIComponent(arr[1]);
				app.state.isSearch = true;
				$('#search_text').text(app.searchText);

				if (app.state.isReady) {
					$('#search_count').empty();
					$('#search_result').html(tmpl('temp_loading'));

					setTimeout(function () {
						app.search(app.searchText);
					}, 400);
				}
			}

			$.each($('.search_input'), function (idx, elem) {
				$(elem).val(app.searchText);
			});
		});

		$(window).on('resize', _.debounce(function () {
			if ($(window).width() > app.smallScreenCriteria) {
				app.state.isLargeScreen = true;
				app.state.isSmallScreen = false;
			}
			else {
				app.state.isLargeScreen = false;
				app.state.isSmallScreen = true;
			}

			app.refreshUI();
		}, 100));

		$(window).on('load', function () {
			app.state.isLoading = false;
			app.state.isReady = true;

			if (app.searchText !== '') {
				app.search(app.searchText);
			}
		});
	};

	app.activateMenu = function () {
		var $menu = $('a[href="'+app.pathName+'"]');

		if ($menu.length > 0) {
			app.menu = $menu;
			app.menu.parent().addClass('on');
			$('#contents_title').text(app.menu.text());
		}

		$.each($('[data-menu-grade="minor"]'), function (idx, elem) {
			var uniqueKey = (Math.random() * 1e+9).toFixed(0);

			app.menuList[uniqueKey] = {
				index: idx,
				title: $(elem).find('[data-title]').text(),
				href: $(elem).find('a').prop('href'),
				category: $(elem).parents('[data-category]').data('category'),
				categoryTitle: $(elem).parents('[data-category]').find('[data-menu-grade="major"] [data-title]').text()
			};

			$(elem).find('[data-title]').on('click', function () {
				var top_position = $('#menu_cs_wrapper .tse-scroll-content').scrollTop();

				setCookie('menuscroll', top_position, 1);
			});
		});

		$('[data-menu-grade="major"]').on('click', function () {
			var $menuCategory = $(this).parents('[data-category]');

			if ($menuCategory.hasClass('opened')) {
				$menuCategory.removeClass('opened');
				$menuCategory.find('.menu_title i').removeClass('mdi-minus').addClass('mdi-plus');
				$menuCategory.find('.menu_depth').stop().slideUp(400, function () {
					try {
						$('#menu_cs_wrapper').TrackpadScrollEmulator('recalculate');
					}
					catch (ex) {
						// pass
					}
				});
			}
			else {
				$menuCategory.addClass('opened');
				$menuCategory.find('.menu_title i').removeClass('mdi-plus').addClass('mdi-minus');
				$menuCategory.find('.menu_depth').stop().slideDown(400, function () {
					try {
						$('#menu_cs_wrapper').TrackpadScrollEmulator('recalculate');
					}
					catch (ex) {
						// pass
					}
				});
			}
		});
	};

	app.activateSearch = function () {
		$('.search_input').on('keyup', _.debounce(function (e) {
			var plainKeyword = $(this).val();
			var trimmedKeyword = _.trim(plainKeyword);

			if (e.keyCode === 13) {
				$.each($('.search_input'), function (idx, elem) {
					$(elem).val(trimmedKeyword);
				});

				if (trimmedKeyword !== '') {
					$('#contents_search .contents_wrap').show();

					if (app.searchText === '') {
						history.pushState(null, '', '#search/' + trimmedKeyword);
					}
					else {
						history.replaceState(null, '', '#search/' + trimmedKeyword);
					}
					$(window).trigger('hashchange');
				}
			}
			else {
				$.each($('.search_input'), function (idx, elem) {
					$(elem).val(plainKeyword);
				});
			}
		}, 100));

		$('#search_opener').on('click', function () {
			if (app.state.isSmallScreen) {
				$('#sub_page_wrap').removeClass('active_menu');
				$('#contents_normal').hide();
				$('#contents_search').show();
				$('#contents_search .contents_wrap').hide();
			}
		});

		$('#search_closer').on('click', function () {
			if (app.state.isSmallScreen) {
				if (app.state.isSearch) {
					history.back();
				}
				else {
					$('#contents_normal').show();
					$('#contents_search').hide();
				}
			}
		});
	};

	app.refreshUI = function () {
		if (app.state.isLargeScreen) {
			if (app.state.isSearch) {
				// nothing to do
			}
			else {
				$('#contents_normal').show();
				$('#contents_search').hide();
			}
		}
	};

	app.search = function (keyword) {
		keyword = keyword.replace(/\s+/g, '');

		var result = _.filter(app.menuList, function (o) {
			return (o.title.replace(/\s+/g, '').indexOf(keyword) !== -1);
		});
		var resultCount = result.length;

		$('#search_count').html(resultCount);

		if (resultCount > 0) {
			var orderedResult = _.orderBy(result, ['index'], ['asc']);

			$('#search_result').html(tmpl('temp_valid_result', orderedResult));
		}
		else {
			$('#search_result').html(tmpl('temp_empty_result'));
		}
	};

	app.initialize();
})();
